import React from 'react';
import { RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StockReturnsTable } from '../../components/stock/StockReturnsTable';

const StockReturnsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Stock Returns"
        description="Manage customer return requests and process refunds"
        icon={RotateCcw}
      />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <StockReturnsTable />
      </div>
    </div>
  );
};

export default StockReturnsPage;
