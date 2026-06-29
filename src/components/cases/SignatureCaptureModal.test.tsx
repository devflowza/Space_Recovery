import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignatureCaptureModal } from './SignatureCaptureModal';

describe('SignatureCaptureModal', () => {
  it('captures a typed signature', () => {
    const onCapture = vi.fn();
    render(<SignatureCaptureModal open onClose={vi.fn()} title="Approver signature" onCapture={onCapture} />);
    // default method = typed: type a name, confirm
    fireEvent.change(screen.getByLabelText(/type your name/i), { target: { value: 'Tech A' } });
    fireEvent.click(screen.getByRole('button', { name: /apply signature/i }));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ method: 'typed', typedValue: 'Tech A' }));
  });

  it('captures a click-to-accept signature', () => {
    const onCapture = vi.fn();
    render(<SignatureCaptureModal open onClose={vi.fn()} title="Approver signature" onCapture={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: /accept/i })); // switch to Accept method
    fireEvent.click(screen.getByLabelText(/i confirm/i));
    fireEvent.click(screen.getByRole('button', { name: /apply signature/i }));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ method: 'click_to_accept' }));
  });
});
