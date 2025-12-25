import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";

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
    // In Next.js, redirect never returns; model that by throwing
    redirect: vi.fn(() => {
      throw new Error("REDIRECT");
    }),
  };
});

vi.mock("next/cache", () => {
  return {
    revalidatePath: vi.fn(),
  };
});

const mockedCreateClient = vi.mocked(
  (await import("@/utils/supabase/server")) as unknown as {
    createClient: () => Promise<ReturnType<typeof createMockSupabaseClient>>;
  },
).createClient;
const { redirect } = await import("next/navigation");

const { updateProfile, uploadAvatar } = await import("./actions");

describe("profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when user is not authenticated in updateProfile", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    client.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as never);
    mockedCreateClient.mockResolvedValueOnce(client);

    const formData = new FormData();
    formData.set("display_name", "Test User");
    formData.set("username", "testuser");

    await expect(updateProfile(formData)).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("redirects with error when username is already taken", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    mockedCreateClient.mockResolvedValueOnce(client);

    client.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    client.from.mockReturnThis();
    client.select.mockReturnThis();
    client.eq.mockReturnThis();
    (client as unknown as { neq: () => typeof client }).neq = vi
      .fn()
      .mockReturnValue(client);
    (client as unknown as { maybeSingle: () => Promise<unknown> }).maybeSingle =
      vi.fn().mockResolvedValueOnce({
      data: { id: "user-2" },
      error: null,
      });

    const formData = new FormData();
    formData.set("display_name", "Test User");
    formData.set("username", "takenname");

    await expect(updateProfile(formData)).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/profile?error=username_taken");
  });

  it("uploads avatar when valid file is provided", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    mockedCreateClient.mockResolvedValueOnce(client);

    client.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("avatar", file);

    // uploadAvatar will redirect on success, which we model as throwing
    await uploadAvatar(formData).catch(() => {});
    expect(client.storage.from).toHaveBeenCalledWith("avatars");
  });

  it("redirects when no avatar file is provided", async () => {
    const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
      createMockSupabaseClient() as Mocked<
        ReturnType<typeof createMockSupabaseClient>
      >;
    mockedCreateClient.mockResolvedValueOnce(client);

    client.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const formData = new FormData();

    await expect(uploadAvatar(formData)).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/profile?error=no_file");
  });
});
