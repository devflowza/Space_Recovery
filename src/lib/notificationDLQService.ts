import { supabase } from './supabaseClient';
import type { Database, Json } from '../types/database.types';

type NotificationEventRow = Database['public']['Tables']['notification_events']['Row'];
type NotificationEventInsert = Database['public']['Tables']['notification_events']['Insert'];
type NotificationLogRow = Database['public']['Tables']['notification_log']['Row'];

export type DLQChannel = 'all' | 'in_app' | 'email';
export type DLQStatus = 'all' | 'failed' | 'bounced' | 'dlq';

export interface DLQFilters {
  eventType?: string;
  channel?: DLQChannel;
  status?: DLQStatus;
  startDate?: string;
  endDate?: string;
}

export interface DLQEvent extends NotificationEventRow {
  is_stuck: boolean;
  is_unprocessed: boolean;
  failed_log_count: number;
}

export interface DLQStats {
  unprocessed: number;
  failedDeliveries: number;
  stuckLongRunning: number;
}

const STUCK_THRESHOLD_MINUTES = 5;
const LONG_RUNNING_HOURS = 1;

function stuckCutoffIso(): string {
  return new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();
}

function longRunningCutoffIso(): string {
  return new Date(Date.now() - LONG_RUNNING_HOURS * 60 * 60 * 1000).toISOString();
}

export async function getDLQStats(): Promise<DLQStats> {
  const longRunningCutoff = longRunningCutoffIso();

  const [unprocessedRes, failedRes, stuckRes] = await Promise.all([
    supabase
      .from('notification_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null)
      .is('deleted_at', null),
    supabase
      .from('notification_log')
      .select('id', { count: 'exact', head: true })
      .in('status', ['failed', 'bounced', 'dlq'])
      .is('deleted_at', null),
    supabase
      .from('notification_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null)
      .lt('occurred_at', longRunningCutoff)
      .is('deleted_at', null),
  ]);

  if (unprocessedRes.error) throw unprocessedRes.error;
  if (failedRes.error) throw failedRes.error;
  if (stuckRes.error) throw stuckRes.error;

  return {
    unprocessed: unprocessedRes.count ?? 0,
    failedDeliveries: failedRes.count ?? 0,
    stuckLongRunning: stuckRes.count ?? 0,
  };
}

export async function getDLQEvents(filters: DLQFilters = {}): Promise<DLQEvent[]> {
  const stuckCutoff = stuckCutoffIso();
  const longRunningCutoff = longRunningCutoffIso();

  let query = supabase
    .from('notification_events')
    .select('*')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .limit(200);

  query = query.or(
    `processing_attempts.gt.0,last_error.not.is.null,and(processed_at.is.null,occurred_at.lt.${stuckCutoff})`,
  );

  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.startDate) {
    query = query.gte('occurred_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('occurred_at', filters.endDate);
  }

  const { data: events, error } = await query;
  if (error) throw error;

  const rows = events ?? [];
  if (rows.length === 0) return [];

  const eventIds = rows.map((r) => r.id);
  const failedStatuses = ['failed', 'bounced', 'dlq'];

  let logsQuery = supabase
    .from('notification_log')
    .select('event_id, channel, status')
    .in('event_id', eventIds)
    .is('deleted_at', null);

  if (filters.channel && filters.channel !== 'all') {
    logsQuery = logsQuery.eq('channel', filters.channel);
  }
  if (filters.status && filters.status !== 'all') {
    logsQuery = logsQuery.eq('status', filters.status);
  } else {
    logsQuery = logsQuery.in('status', failedStatuses);
  }

  const { data: logs } = await logsQuery;

  const failedCounts = new Map<string, number>();
  const eventIdsWithMatchingLog = new Set<string>();
  (logs ?? []).forEach((log) => {
    if (!log.event_id) return;
    eventIdsWithMatchingLog.add(log.event_id);
    if (failedStatuses.includes(log.status)) {
      failedCounts.set(log.event_id, (failedCounts.get(log.event_id) ?? 0) + 1);
    }
  });

  const filtered = rows.filter((event) => {
    if (filters.channel && filters.channel !== 'all') {
      return eventIdsWithMatchingLog.has(event.id);
    }
    if (filters.status && filters.status !== 'all') {
      return eventIdsWithMatchingLog.has(event.id);
    }
    return true;
  });

  return filtered.map<DLQEvent>((event) => ({
    ...event,
    is_unprocessed: event.processed_at === null,
    is_stuck:
      event.processed_at === null && new Date(event.occurred_at).getTime() < new Date(longRunningCutoff).getTime(),
    failed_log_count: failedCounts.get(event.id) ?? 0,
  }));
}

export async function getEventLogs(eventId: string): Promise<NotificationLogRow[]> {
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDistinctEventTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('notification_events')
    .select('event_type')
    .is('deleted_at', null)
    .order('event_type', { ascending: true })
    .limit(500);

  if (error) throw error;
  const seen = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.event_type) seen.add(row.event_type);
  });
  return Array.from(seen).sort();
}

export async function retryEvent(event: NotificationEventRow): Promise<NotificationEventRow> {
  const retrySuffix = `-retry-${Date.now()}`;
  const newDedupKey = `${event.dedup_key}${retrySuffix}`;

  const insertPayload: NotificationEventInsert = {
    tenant_id: event.tenant_id,
    event_type: event.event_type,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    actor_user_id: event.actor_user_id,
    payload: (event.payload ?? {}) as Json,
    dedup_key: newDedupKey,
    occurred_at: new Date().toISOString(),
    processing_attempts: 0,
    last_error: null,
    processed_at: null,
  };

  const { data, error } = await supabase
    .from('notification_events')
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Retry insert returned no row');
  return data;
}

export async function markEventResolved(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('notification_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) throw error;
}
