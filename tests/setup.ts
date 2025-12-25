import "@testing-library/jest-dom/vitest";

// Basic mock for next/navigation used in server/client components during tests
import { vi } from "vitest";

vi.mock("next/navigation", () => {
  return {
    redirect: vi.fn(),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

// Mock URL.createObjectURL and URL.revokeObjectURL for tests
// These are browser APIs that may not be available in the test environment
if (typeof URL.createObjectURL === "undefined") {
  global.URL.createObjectURL = vi.fn(() => "blob:test-url");
}
if (typeof URL.revokeObjectURL === "undefined") {
  global.URL.revokeObjectURL = vi.fn();
}
