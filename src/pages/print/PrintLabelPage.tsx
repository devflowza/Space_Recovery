import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateCaseLabel } from '../../lib/pdf/pdfService';
import { Printer, X, Loader2, AlertCircle, RefreshCw, Tag } from 'lucide-react';

export const PrintLabelPage = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setError('Invalid case ID');
      setIsGenerating(false);
      return;
    }

    const generatePDF = async () => {
      setIsGenerating(true);
      setError(null);

      const result = await generateCaseLabel(caseId, false);

      if (!result.success) {
        setError(result.error || 'Failed to generate PDF');
      }

      setIsGenerating(false);
    };

    generatePDF();
  }, [caseId]);

  const handleRetry = () => {
    if (caseId) {
      setIsGenerating(true);
      setError(null);
      generateCaseLabel(caseId, false).then((result) => {
        if (!result.success) {
          setError(result.error || 'Failed to generate PDF');
        }
        setIsGenerating(false);
      });
    }
  };

  const handleDownload = () => {
    if (caseId) {
      generateCaseLabel(caseId, true);
    }
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate(-1);
    }
  };

  if (!caseId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Case ID</h2>
          <p className="text-slate-600 mb-6">No case ID was provided.</p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        {isGenerating ? (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Generating Label</h2>
            <p className="text-slate-600">Please wait while your case label is being generated...</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Generation Failed</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <Tag className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Label Ready</h2>
            <p className="text-slate-600 mb-6">Your case label has been generated and opened.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrintLabelPage;
