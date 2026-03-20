import React, { useState } from 'react';
import { ShieldCheck, Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface TestResult {
  test_name: string;
  passed: boolean;
  details: string;
}

export const TenantIsolationTestPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const runTests = async () => {
    setRunning(true);
    setError('');
    setResults([]);

    try {
      const { data, error: rpcError } = await supabase.rpc('test_tenant_isolation');
      if (rpcError) throw rpcError;
      setResults((data ?? []) as TestResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run isolation tests');
    } finally {
      setRunning(false);
    }
  };

  const summaryResults = results.filter(r => r.test_name.startsWith('SUMMARY'));
  const detailResults = results.filter(r => !r.test_name.startsWith('SUMMARY'));
  const passCount = detailResults.filter(r => r.passed).length;
  const failCount = detailResults.filter(r => !r.passed).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Tenant Isolation Tests
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Verify RLS policies, security functions, and soft-delete patterns across all tenant-scoped tables
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={running}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running...' : 'Run Tests'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {summaryResults.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{detailResults.length}</p>
            <p className="text-sm text-slate-500">Total Tests</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{passCount}</p>
            <p className="text-sm text-green-600">Passed</p>
          </div>
          <div className={`bg-white rounded-lg border p-4 text-center ${failCount > 0 ? 'border-red-200' : 'border-slate-200'}`}>
            <p className={`text-3xl font-bold ${failCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{failCount}</p>
            <p className={`text-sm ${failCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Failed</p>
          </div>
        </div>
      )}

      {summaryResults.map((s, i) => (
        <div key={i} className={`p-4 rounded-lg border flex items-center gap-3 ${s.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {s.passed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <div>
            <p className={`text-sm font-medium ${s.passed ? 'text-green-800' : 'text-red-800'}`}>{s.test_name}</p>
            <p className={`text-xs ${s.passed ? 'text-green-600' : 'text-red-600'}`}>{s.details}</p>
          </div>
        </div>
      ))}

      {detailResults.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Detailed Results</h3>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {detailResults.map((r, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span className="flex-1 font-mono text-xs text-slate-700">{r.test_name}</span>
                <span className="text-xs text-slate-400">{r.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
