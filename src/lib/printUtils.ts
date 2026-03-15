export const printReceipt = (caseId: string, caseNumber: string): void => {
  const printUrl = `/print/receipt/${caseId}`;
  window.open(printUrl, '_blank');
};

export const printLabel = (caseId: string, caseNumber: string): void => {
  const printUrl = `/print/label/${caseId}`;
  window.open(printUrl, '_blank');
};
