// Lightweight Supabase client mocks for unit/integration tests
import { vi } from "vitest";

export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ data: { path: "avatars/user-1/avatar.png" }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/avatar.png" },
        error: null,
      }),
    },
  };
};
