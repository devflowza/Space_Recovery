import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DuplicateCaseConfirmationModal } from './DuplicateCaseConfirmationModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  originalCaseNumber: 'C-0019',
  customerName: 'Arshad K',
  serviceName: 'Data Recovery',
};

describe('DuplicateCaseConfirmationModal', () => {
  it('shows the newly generated job number prominently and enables confirm', () => {
    render(<DuplicateCaseConfirmationModal {...baseProps} newCaseNumber="C-0020" />);
    expect(screen.getByText(/new job number/i)).toBeInTheDocument();
    expect(screen.getByText(/C-0020/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm duplicate/i })).toBeEnabled();
  });

  it('disables confirm while the number is still being reserved', () => {
    render(<DuplicateCaseConfirmationModal {...baseProps} newCaseNumber={null} isGeneratingNumber />);
    expect(screen.getByRole('button', { name: /confirm duplicate/i })).toBeDisabled();
  });

  it('disables confirm when no job number is available', () => {
    render(<DuplicateCaseConfirmationModal {...baseProps} newCaseNumber={null} />);
    expect(screen.getByRole('button', { name: /confirm duplicate/i })).toBeDisabled();
  });
});
