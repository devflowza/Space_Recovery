import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

export type NotificationSubscriptionRow =
  Database['public']['Tables']['notification_subscriptions']['Row'];
export type NotificationSubscriptionInsert =
  Database['public']['Tables']['notification_subscriptions']['Insert'];
export type NotificationSubscriptionUpdate =
  Database['public']['Tables']['notification_subscriptions']['Update'];

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'webhook';

export type NotificationFrequency =
  | 'immediate'
  | 'hourly_digest'
  | 'daily_digest'
  | 'off';

export interface UpsertSubscriptionInput {
  userId: string;
  eventType: string;
  channel: NotificationChannel;
  enabled?: boolean;
  frequency?: NotificationFrequency;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

/**
 * Fetch all notification subscriptions for the current user.
 * RLS scopes by tenant_id automatically.
 */
export async function fetchMySubscriptions(
  userId: string
): Promise<NotificationSubscriptionRow[]> {
  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('recipient_type', 'staff')
    .is('deleted_at', null);

  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert a notification subscription. Uses ON CONFLICT (tenant_id, user_id,
 * event_type, channel). The DB unique constraint
 * `notification_subscriptions_unique_user` uses NULLS NOT DISTINCT, so the
 * upsert lands on the existing row when one is present.
 *
 * tenant_id is omitted from the insert payload — the row-level security policy
 * + tenant-and-audit trigger on this table populate it from the authenticated
 * user's profile.
 */
export async function upsertSubscription(
  input: UpsertSubscriptionInput
): Promise<NotificationSubscriptionRow> {
  // The trigger `set_notification_subscriptions_tenant_and_audit` fills
  // tenant_id automatically; we cast to bypass the required tenant_id column
  // typing on Insert.
  const payload = {
    user_id: input.userId,
    recipient_type: 'staff',
    event_type: input.eventType,
    channel: input.channel,
    enabled: input.enabled ?? true,
    frequency: input.frequency ?? 'immediate',
    quiet_hours_start: input.quietHoursStart ?? null,
    quiet_hours_end: input.quietHoursEnd ?? null,
  } as unknown as NotificationSubscriptionInsert;

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .upsert(payload, {
      onConflict: 'tenant_id,user_id,event_type,channel',
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Upsert returned no row');
  return data;
}

/**
 * Update an existing subscription by id.
 */
export async function updateSubscription(
  id: string,
  updates: Pick<
    NotificationSubscriptionUpdate,
    'enabled' | 'frequency' | 'quiet_hours_start' | 'quiet_hours_end'
  >
): Promise<NotificationSubscriptionRow> {
  const { data, error } = await supabase
    .from('notification_subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Update returned no row');
  return data;
}
