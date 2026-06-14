import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopularCards } from './PopularCards';

describe('PopularCards', () => {
  it('renders all three cards', () => {
    render(<PopularCards onSelect={vi.fn()} />);
    expect(screen.getByText(/NVDA/)).toBeInTheDocument();
    expect(screen.getByText(/TSLA/)).toBeInTheDocument();
    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
  });

  it('calls onSelect with the correct symbol when a card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PopularCards onSelect={onSelect} />);

    await user.click(screen.getByText(/AI Kingpin/i).closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('NVDA');

    await user.click(screen.getByText(/Momentum Check/i).closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('TSLA');

    await user.click(screen.getByText(/Safe Bet/i).closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('AAPL');
  });

  it('shows Quick Research label on each card', () => {
    render(<PopularCards onSelect={vi.fn()} />);
    expect(screen.getAllByText(/Quick Research/i)).toHaveLength(3);
  });
});
