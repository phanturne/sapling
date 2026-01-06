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

const { createSpace, updateSpace, deleteSpace } = await import("./actions");

describe("spaces actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSpace", () => {
    it("redirects to login when user is not authenticated", async () => {
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
      formData.set("title", "Test Space");
      formData.set("visibility", "private");

      await expect(createSpace(formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/login");
    });

    it("redirects with error when validation fails (empty title)", async () => {
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
      formData.set("title", "");
      formData.set("visibility", "private");

      await expect(createSpace(formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces?error=validation_failed");
    });

    it("redirects with error when title is too long", async () => {
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
      formData.set("title", "a".repeat(256));
      formData.set("visibility", "private");

      await expect(createSpace(formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces?error=validation_failed");
    });

    it("redirects with error when visibility is invalid", async () => {
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
      formData.set("title", "Test Space");
      formData.set("visibility", "invalid");

      await expect(createSpace(formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces?error=validation_failed");
    });

    it("creates space successfully with valid data", async () => {
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
      (client as unknown as { insert: () => typeof client }).insert = vi
        .fn()
        .mockReturnThis();
      (client as unknown as { select: () => typeof client }).select = vi
        .fn()
        .mockReturnThis();
      (client as unknown as { single: () => Promise<unknown> }).single =
        vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", title: "Test Space" },
          error: null,
        });

      const formData = new FormData();
      formData.set("title", "Test Space");
      formData.set("description", "Test description");
      formData.set("visibility", "public");

      await expect(createSpace(formData)).rejects.toThrow("REDIRECT");
      expect(client.from).toHaveBeenCalledWith("spaces");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1");
    });
  });

  describe("updateSpace", () => {
    it("redirects to login when user is not authenticated", async () => {
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
      formData.set("title", "Updated Space");

      await expect(updateSpace("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/login");
    });

    it("redirects with error when user does not own the space", async () => {
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
      (client as unknown as { single: () => Promise<unknown> }).single =
        vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", user_id: "user-2" },
          error: null,
        });

      const formData = new FormData();
      formData.set("title", "Updated Space");

      await expect(updateSpace("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1?error=not_found");
    });

    it("redirects with error when validation fails", async () => {
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
      (client as unknown as { single: () => Promise<unknown> }).single =
        vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", user_id: "user-1" },
          error: null,
        });

      const formData = new FormData();
      formData.set("title", "");

      await expect(updateSpace("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1?error=validation_failed",
      );
    });

    it("updates space successfully with valid data", async () => {
      const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
        createMockSupabaseClient() as Mocked<
          ReturnType<typeof createMockSupabaseClient>
        >;
      mockedCreateClient.mockResolvedValueOnce(client);

      client.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });

      // Mock the ownership check chain
      const ownershipChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", user_id: "user-1" },
          error: null,
        }),
      };

      // Mock the update chain
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(updateChain as unknown as typeof client);

      const formData = new FormData();
      formData.set("title", "Updated Space");
      formData.set("description", "Updated description");
      formData.set("visibility", "public");

      await expect(updateSpace("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1?success=1");
    });
  });

  describe("deleteSpace", () => {
    it("redirects to login when user is not authenticated", async () => {
      const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
        createMockSupabaseClient() as Mocked<
          ReturnType<typeof createMockSupabaseClient>
        >;
      client.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as never);
      mockedCreateClient.mockResolvedValueOnce(client);

      await expect(deleteSpace("space-1")).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/login");
    });

    it("redirects with error when user does not own the space", async () => {
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
      (client as unknown as { single: () => Promise<unknown> }).single =
        vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", user_id: "user-2" },
          error: null,
        });

      await expect(deleteSpace("space-1")).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1?error=not_found");
    });

    it("deletes space successfully when user owns it", async () => {
      const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
        createMockSupabaseClient() as Mocked<
          ReturnType<typeof createMockSupabaseClient>
        >;
      mockedCreateClient.mockResolvedValueOnce(client);

      client.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });

      // Mock the ownership check chain
      const ownershipChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "space-1", user_id: "user-1" },
          error: null,
        }),
      };

      // Mock the delete chain
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(deleteChain as unknown as typeof client);

      await expect(deleteSpace("space-1")).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces?success=1");
    });
  });
});

