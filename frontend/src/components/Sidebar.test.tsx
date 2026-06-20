import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import type { HistoryEntry } from "../types";

const HISTORY: HistoryEntry[] = [
  { symbol: "TSLA", timestamp: "analyzed Sep 14" },
  { symbol: "NVDA", timestamp: "analyzed Sep 13" },
];

function setup(isOpen = true, history: HistoryEntry[] = []) {
  const onToggle = vi.fn();
  const onSelectTicker = vi.fn();
  const onNewResearch = vi.fn();
  render(
    <Sidebar
      isOpen={isOpen}
      onToggle={onToggle}
      history={history}
      onSelectTicker={onSelectTicker}
      onNewResearch={onNewResearch}
    />,
  );
  return { onToggle, onSelectTicker, onNewResearch };
}

describe("Sidebar — open state", () => {
  it("shows the header title when open", () => {
    setup(true);
    expect(screen.getByText(/Research History/i)).toBeInTheDocument();
  });

  it("shows the collapse toggle button", () => {
    setup(true);
    expect(
      screen.getByRole("button", { name: /Collapse/i }),
    ).toBeInTheDocument();
  });

  it("shows New Research button when open", () => {
    setup(true);
    expect(screen.getByText(/New Research/i)).toBeInTheDocument();
  });

  it("renders history items", () => {
    setup(true, HISTORY);
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByText("NVDA")).toBeInTheDocument();
  });

  it("calls onSelectTicker with the symbol when a history item is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectTicker } = setup(true, HISTORY);
    await user.click(screen.getByText("TSLA"));
    expect(onSelectTicker).toHaveBeenCalledWith("TSLA");
  });

  it("calls onToggle when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    const { onToggle } = setup(true);
    await user.click(screen.getByRole("button", { name: /Collapse/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("Sidebar — collapsed state", () => {
  it("hides the header title when collapsed", () => {
    setup(false);
    expect(screen.queryByText(/Research History/i)).not.toBeInTheDocument();
  });

  it("shows the expand toggle button", () => {
    setup(false);
    expect(screen.getByRole("button", { name: /Expand/i })).toBeInTheDocument();
  });

  it("shows an icon-only New Research button with correct aria-label", () => {
    setup(false);
    expect(
      screen.getByRole("button", { name: /New Research/i }),
    ).toBeInTheDocument();
  });

  it("does not render history items when collapsed", () => {
    setup(false, HISTORY);
    expect(screen.queryByText("TSLA")).not.toBeInTheDocument();
  });

  it("calls onToggle when the expand button is clicked", async () => {
    const user = userEvent.setup();
    const { onToggle } = setup(false);
    await user.click(screen.getByRole("button", { name: /Expand/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
