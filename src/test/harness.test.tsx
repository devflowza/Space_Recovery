import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('jsdom test harness', () => {
  it('renders into jsdom and supports jest-dom matchers', () => {
    render(<button>click me</button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('click me')).toHaveTextContent('click me');
  });
});
