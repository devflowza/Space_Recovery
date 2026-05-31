import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function TrapHarness({ active }: { active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>({ active });
  return (
    <div>
      <button>outside-before</button>
      <div ref={ref}>
        <button>first</button>
        <button>second</button>
        <button>third</button>
      </div>
      <button>outside-after</button>
    </div>
  );
}

function RestoreHarness() {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>({ active: open, restoreFocus: true });
  return (
    <div>
      <button onClick={() => setOpen(true)}>opener</button>
      {open && (
        <div ref={ref}>
          <button onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}

function EmptyTrapHarness() {
  const ref = useFocusTrap<HTMLDivElement>({ active: true });
  return (
    <div>
      <button>outside</button>
      <div ref={ref} data-testid="empty-trap">
        <p>no focusable content</p>
      </div>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus to the first tabbable element when activated', () => {
    render(<TrapHarness active />);
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps focus from last to first on Tab', async () => {
    const user = userEvent.setup();
    render(<TrapHarness active />);
    screen.getByText('third').focus();
    await user.tab();
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps focus from first to last on Shift+Tab', async () => {
    const user = userEvent.setup();
    render(<TrapHarness active />);
    screen.getByText('first').focus();
    await user.tab({ shift: true });
    expect(screen.getByText('third')).toHaveFocus();
  });

  it('does not manage focus when inactive', () => {
    render(<TrapHarness active={false} />);
    expect(screen.getByText('first')).not.toHaveFocus();
  });

  it('restores focus to the opener when deactivated', async () => {
    const user = userEvent.setup();
    render(<RestoreHarness />);
    const opener = screen.getByText('opener');
    await user.click(opener);
    expect(screen.getByText('close')).toHaveFocus();
    await user.click(screen.getByText('close'));
    expect(opener).toHaveFocus();
  });

  it('focuses the container itself when it has no tabbable children', () => {
    render(<EmptyTrapHarness />);
    expect(screen.getByTestId('empty-trap')).toHaveFocus();
  });

  it('does not crash on Tab when there are no tabbable children', async () => {
    const user = userEvent.setup();
    render(<EmptyTrapHarness />);
    await user.keyboard('{Tab}');
    expect(screen.getByTestId('empty-trap')).toHaveFocus();
  });
});
