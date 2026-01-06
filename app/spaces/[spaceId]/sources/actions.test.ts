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

const { uploadSource, deleteSource } = await import("./actions");

describe("sources actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadSource", () => {
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

      const formData = new FormData();
      formData.set("source_type", "file");

      const result = await uploadSource("space-1", formData);
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

      const formData = new FormData();
      formData.set("source_type", "file");

      const result = await uploadSource("space-1", formData);
      expect(result).toEqual({ success: false, error: "not_found" });
    });

    describe("file upload", () => {
      it("returns error when no file is provided", async () => {
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

        client.from.mockReturnValueOnce(
          ownershipChain as unknown as typeof client,
        );

        const formData = new FormData();
        formData.set("source_type", "file");
        formData.set("title", ""); // Empty string to pass Zod validation
        // Don't set file - this should trigger no_file error after Zod passes

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: false, error: "no_file" });
      });

      it("returns error when file type is invalid", async () => {
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

        client.from.mockReturnValueOnce(
          ownershipChain as unknown as typeof client,
        );

        const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.set("source_type", "file");
        formData.set("title", ""); // Empty string to pass Zod validation
        formData.set("file", file);

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: false, error: "invalid_file_type" });
      });

      it("returns error when file is too large", async () => {
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

        client.from.mockReturnValueOnce(
          ownershipChain as unknown as typeof client,
        );

        // Create a file larger than 10MB
        const largeContent = new Array(11 * 1024 * 1024).fill("a").join("");
        const file = new File([largeContent], "test.pdf", {
          type: "application/pdf",
        });
        const formData = new FormData();
        formData.set("source_type", "file");
        formData.set("title", ""); // Empty string to pass Zod validation
        formData.set("file", file);

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: false, error: "file_too_large" });
      });

      it("uploads file successfully with valid data", async () => {
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
            data: { id: "source-1", title: "test.pdf" },
            error: null,
          }),
        };

        client.from
          .mockReturnValueOnce(ownershipChain as unknown as typeof client)
          .mockReturnValueOnce(insertChain as unknown as typeof client);

        client.storage.from.mockReturnThis();
        (client.storage as unknown as { upload: () => Promise<unknown> })
          .upload = vi.fn().mockResolvedValueOnce({
          data: { path: "user-1/space-1/file.pdf" },
          error: null,
        });

        const file = new File(["content"], "test.pdf", {
          type: "application/pdf",
        });
        const formData = new FormData();
        formData.set("source_type", "file");
        formData.set("file", file);
        formData.set("title", "Test Source");

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: true });
      });
    });

    describe("URL upload", () => {
      it("returns error when URL is invalid", async () => {
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
        formData.set("source_type", "url");
        formData.set("url", "not-a-valid-url");

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: false, error: "invalid_url" });
      });

      it("returns error when URL does not start with http", async () => {
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
        formData.set("source_type", "url");
        formData.set("url", "ftp://example.com");

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: false, error: "invalid_url" });
      });

      it("creates URL source successfully with valid data", async () => {
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
            data: { id: "source-1", title: "https://example.com" },
            error: null,
          }),
        };

        client.from
          .mockReturnValueOnce(ownershipChain as unknown as typeof client)
          .mockReturnValueOnce(insertChain as unknown as typeof client);

        const formData = new FormData();
        formData.set("source_type", "url");
        formData.set("url", "https://example.com/article");
        formData.set("title", "Test Article");

        const result = await uploadSource("space-1", formData);
        expect(result).toEqual({ success: true });
      });
    });

    it("returns error when source type is invalid", async () => {
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
      formData.set("source_type", "invalid");

      const result = await uploadSource("space-1", formData);
      expect(result).toEqual({ success: false, error: "invalid_source_type" });
    });
  });

  describe("deleteSource", () => {
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

      await expect(deleteSource("space-1", "source-1")).rejects.toThrow(
        "REDIRECT",
      );
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

      await expect(deleteSource("space-1", "source-1")).rejects.toThrow(
        "REDIRECT",
      );
      expect(redirect).toHaveBeenCalledWith("/spaces/space-1?error=not_found");
    });

    it("redirects with error when source does not exist", async () => {
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

      await expect(deleteSource("space-1", "source-1")).rejects.toThrow(
        "REDIRECT",
      );
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/sources?error=not_found",
      );
    });

    it("deletes source successfully and removes file from storage", async () => {
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

      // Mock the source check chain
      const sourceCheckChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "source-1", file_path: "user-1/space-1/file.pdf" },
          error: null,
        }),
      };

      // Mock the delete chain (uses .eq().eq() for space_id and id)
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
        .mockReturnValueOnce(sourceCheckChain as unknown as typeof client)
        .mockReturnValueOnce(deleteChain as unknown as typeof client);

      client.storage.from.mockReturnThis();
      (client.storage as unknown as { remove: () => Promise<unknown> }).remove =
        vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        });

      await expect(deleteSource("space-1", "source-1")).rejects.toThrow(
        "REDIRECT",
      );
      expect(client.storage.from).toHaveBeenCalledWith("sources");
      expect(redirect).toHaveBeenCalledWith(
        "/spaces/space-1/sources?success=deleted",
      );
    });
  });
});

