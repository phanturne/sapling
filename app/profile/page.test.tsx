import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, type Mocked } from "vitest";

import { createMockSupabaseClient } from "@/tests/__mocks__/supabase";

vi.mock("@/utils/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );
  return {
    ...actual,
    redirect: vi.fn(() => {
      throw new Error("REDIRECT");
    }),
  };
});

const mockedCreateClient = vi.mocked(
  (await import("@/utils/supabase/server")) as unknown as {
    createClient: () => Promise<ReturnType<typeof createMockSupabaseClient>>;
  },
).createClient;
const { redirect } = await import("next/navigation");

const ProfilePage = (await import("./page")).default;

describe("ProfilePage", () => {
  it("redirects unauthenticated users to login", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    mockedCreateClient.mockResolvedValueOnce(client);

    client.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(ProfilePage({})).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders profile form with existing data", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    mockedCreateClient.mockResolvedValueOnce(client);

    client.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });

    client.from.mockReturnThis();
    client.select.mockReturnThis();
    client.eq.mockReturnThis();
    (client as unknown as { maybeSingle: () => Promise<unknown> }).maybeSingle =
      vi.fn().mockResolvedValueOnce({
      data: {
        id: "user-1",
        display_name: "Test User",
        username: "testuser",
        avatar_url: null,
        email: "test@example.com",
        created_at: "",
        updated_at: "",
      },
      error: null,
      });

    const ui = await ProfilePage({});
    render(ui as React.ReactElement);

    expect(
      screen.getByLabelText(/Display name/i),
    ).toHaveDisplayValue("Test User");
    expect(screen.getByLabelText(/Username/i)).toHaveDisplayValue("testuser");
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});
