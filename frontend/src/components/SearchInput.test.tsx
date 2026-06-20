import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./SearchInput";

function makeFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    const q = new URL(url).searchParams.get("search")?.toUpperCase() ?? "";
    const data =
      q === "AAPL" || q === "AA"
        ? [{ symbol: "AAPL", companyName: "Apple Inc.", assetType: "Stock" }]
        : [];
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  });
}

// Validation tests: wait for fetch to resolve before pressing Enter
describe("SearchInput — validation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("blocks Enter on unknown ticker and shows error", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value="XYZXYZ"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    // Wait for the 150ms debounce + fetch to settle (returns empty for XYZXYZ)
    await waitFor(
      () =>
        expect(globalThis.fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
      { timeout: 500 },
    );
    await act(async () => {}); // flush remaining state updates
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/valid ticker/i)).toBeInTheDocument();
  });

  it("allows Enter on a known ticker once suggestions have loaded", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value="AAPL"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    // Wait for AAPL to appear in the autocomplete dropdown
    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument(), {
      timeout: 500,
    });
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("AAPL");
  });

  it("clears validation error when the input changes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <SearchInput
        value="XYZXYZ"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );

    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    await waitFor(
      () =>
        expect(globalThis.fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
      { timeout: 500 },
    );
    await act(async () => {});
    await user.keyboard("{Enter}");
    expect(screen.getByText(/valid ticker/i)).toBeInTheDocument();

    rerender(
      <SearchInput
        value="A"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await user.type(screen.getByPlaceholderText(/Enter ticker/i), "A");
    expect(screen.queryByText(/valid ticker/i)).not.toBeInTheDocument();
  });

  it("disables input while loading", () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />,
    );
    expect(screen.getByPlaceholderText(/Enter ticker/i)).toBeDisabled();
  });

  it("does not call onSubmit when value is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// Autocomplete tests use real timers + waitFor for the 150ms debounce
describe("SearchInput — autocomplete", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows dropdown suggestions when focused with a matching prefix", async () => {
    const user = userEvent.setup();
    render(
      <SearchInput
        value="AA"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("hides dropdown when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <SearchInput
        value="AA"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await user.keyboard("{Escape}");
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it("shows no dropdown for a value with no matches", async () => {
    const user = userEvent.setup();
    render(
      <SearchInput
        value="XYZXYZ"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    await user.click(screen.getByPlaceholderText(/Enter ticker/i));
    await waitFor(
      () =>
        expect(globalThis.fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
      { timeout: 500 },
    );
    await act(async () => {});
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
