import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';
import { Skeleton } from './Skeleton';

describe('Spinner', () => {
  it('exposes a status role with an accessible label', () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading data');
  });

  it('applies the requested size to the icon', () => {
    render(<Spinner size="lg" label="Loading" />);
    const icon = screen.getByRole('status').querySelector('svg');
    expect(icon).toHaveClass('h-8', 'w-8');
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive tech and merges className', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('h-4', 'w-24');
  });
});
