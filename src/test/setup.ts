import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// App state persists to localStorage, so start every test with empty storage.
beforeEach(() => {
  localStorage.clear();
});

// Vitest globals are off, so Testing Library can't register its own auto-cleanup.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
