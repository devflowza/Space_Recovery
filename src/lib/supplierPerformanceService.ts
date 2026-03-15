import { supabase } from './supabaseClient';
import type { Database } from '../types/database.types';

type SupplierPerformanceMetric = Database['public']['Tables']['supplier_performance_metrics']['Row'];
type SupplierPerformanceMetricInsert = Database['public']['Tables']['supplier_performance_metrics']['Insert'];

export interface PerformanceEvaluation {
  evaluation_date: string;
  on_time_delivery_rate: number;
  response_time_hours: number;
  quality_score: number;
  pricing_score: number;
  reliability_score: number;
  comments?: string;
}

export async function fetchSupplierPerformanceHistory(supplierId: string) {
  const { data, error } = await supabase
    .from('supplier_performance_metrics')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('metric_period_start', { ascending: false });

  if (error) throw error;
  return data as SupplierPerformanceMetric[];
}

export async function createPerformanceEvaluation(
  supplierId: string,
  evaluation: PerformanceEvaluation,
  userId: string
) {
  const evaluationDate = new Date(evaluation.evaluation_date);
  const periodStart = new Date(evaluationDate.getFullYear(), evaluationDate.getMonth(), 1);
  const periodEnd = new Date(evaluationDate.getFullYear(), evaluationDate.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('supplier_performance_metrics')
    .insert({
      supplier_id: supplierId,
      metric_period_start: periodStart.toISOString().split('T')[0],
      metric_period_end: periodEnd.toISOString().split('T')[0],
      on_time_delivery_rate: evaluation.on_time_delivery_rate,
      average_response_time_hours: evaluation.response_time_hours,
      quality_defect_rate: 5 - evaluation.quality_score,
      pricing_consistency_score: evaluation.pricing_score,
      reliability_score: evaluation.reliability_score,
      overall_rating: (
        evaluation.on_time_delivery_rate +
        evaluation.quality_score +
        evaluation.pricing_score +
        evaluation.reliability_score
      ) / 4,
      notes: evaluation.comments || null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;

  await supabase.rpc('update_supplier_performance_metrics', {
    p_supplier_id: supplierId,
  });

  return data as SupplierPerformanceMetric;
}

export async function getPerformanceTrends(supplierId: string, months: number = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from('supplier_performance_metrics')
    .select('*')
    .eq('supplier_id', supplierId)
    .gte('metric_period_start', startDate.toISOString().split('T')[0])
    .order('metric_period_start', { ascending: true });

  if (error) throw error;
  return data as SupplierPerformanceMetric[];
}
