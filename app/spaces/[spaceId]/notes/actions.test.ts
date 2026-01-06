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

const { createNote, updateNote, deleteNote } = await import("./actions");

describe("notes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createNote", () => {
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
      formData.set("title", "Test Note");
      formData.set("content", "Note content");

      await expect(createNote("space-1", formData)).rejects.toThrow("REDIRECT");
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
      formData.set("title", "Test Note");
      formData.set("content", "Note content");

      await expect(createNote("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1?error=not_found");
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
      formData.set("content", "Note content");

      await expect(createNote("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes?error=validation_failed",
      );
    });

    it("redirects with error when validation fails (empty content)", async () => {
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
      formData.set("title", "Test Note");
      formData.set("content", "");

      await expect(createNote("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes?error=validation_failed",
      );
    });

    it("creates note successfully with valid data", async () => {
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

      // Mock the insert chain
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "note-1", title: "Test Note" },
          error: null,
        }),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(insertChain as unknown as typeof client);

      const formData = new FormData();
      formData.set("title", "Test Note");
      formData.set("content", "Note content");

      await expect(createNote("space-1", formData)).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1/notes/note-1");
    });
  });

  describe("updateNote", () => {
    it("redirects with error when user is not authenticated", async () => {
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
      formData.set("title", "Updated Note");
      formData.set("content", "Updated content");

      await expect(
        updateNote("space-1", "note-1", formData),
      ).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes/note-1?error=unauthorized",
      );
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
      formData.set("title", "Updated Note");
      formData.set("content", "Updated content");

      await expect(
        updateNote("space-1", "note-1", formData),
      ).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes/note-1?error=not_found",
      );
    });

    it("redirects with error when note does not exist", async () => {
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
        vi.fn()
          .mockResolvedValueOnce({
            data: { id: "space-1", user_id: "user-1" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: null,
            error: { message: "Not found" },
          });

      const formData = new FormData();
      formData.set("title", "Updated Note");
      formData.set("content", "Updated content");

      await expect(
        updateNote("space-1", "note-1", formData),
      ).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes/note-1?error=not_found",
      );
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
        vi.fn()
          .mockResolvedValueOnce({
            data: { id: "space-1", user_id: "user-1" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: "note-1", content_hash: "hash-1" },
            error: null,
          });

      const formData = new FormData();
      formData.set("title", "");
      formData.set("content", "Updated content");

      await expect(
        updateNote("space-1", "note-1", formData),
      ).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes/note-1?error=validation_failed",
      );
    });

    it("updates note successfully with valid data", async () => {
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

      // Mock the note check chain
      const noteCheckChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "note-1", content_hash: "old-hash" },
          error: null,
        }),
      };

      // Mock the update chain (update uses .eq().eq() for id and space_id)
      const eqChain = {
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValueOnce(eqChain),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(noteCheckChain as unknown as typeof client)
        .mockReturnValueOnce(updateChain as unknown as typeof client);

      const formData = new FormData();
      formData.set("title", "Updated Note");
      formData.set("content", "Updated content");

      await expect(
        updateNote("space-1", "note-1", formData),
      ).rejects.toThrow("REDIRECT");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/notes/note-1?success=1",
      );
    });
  });

  describe("deleteNote", () => {
    it("returns error when user is not authenticated", async () => {
      const client: Mocked<ReturnType<typeof createMockSupabaseClient>> =
        createMockSupabaseClient() as Mocked<
          ReturnType<typeof createMockSupabaseClient>
        >;
      client.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as never);
      mockedCreateClient.mockResolvedValueOnce(client);

      const result = await deleteNote("space-1", "note-1");
      expect(result).toEqual({ success: false, error: "unauthorized" });
    });

    it("returns error when user does not own the space", async () => {
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

      const result = await deleteNote("space-1", "note-1");
      expect(result).toEqual({ success: false, error: "not_found" });
    });

    it("returns error when delete fails", async () => {
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

      // Mock the delete chain with error
      const eqChain = {
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: "Delete failed" },
        }),
      };
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValueOnce(eqChain),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(deleteChain as unknown as typeof client);

      const result = await deleteNote("space-1", "note-1");
      expect(result).toEqual({ success: false, error: "delete_failed" });
    });

    it("deletes note successfully when user owns the space", async () => {
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

      // Mock the delete chain (note delete uses .eq().eq() for space_id and id)
      const eqChain = {
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValueOnce(eqChain),
      };

      client.from
        .mockReturnValueOnce(ownershipChain as unknown as typeof client)
        .mockReturnValueOnce(deleteChain as unknown as typeof client);

      const result = await deleteNote("space-1", "note-1");
      expect(result).toEqual({ success: true });
    });
  });
});

