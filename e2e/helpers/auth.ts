import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

/**
 * Creates a test user and signs them in for E2E tests.
 * 
 * This helper:
 * 1. Creates a user via Supabase Auth API
 * 2. Signs them in
 * 3. Sets auth cookies in Playwright browser context
 * 
 * @param page - Playwright page object
 * @param email - Test user email (default: test@example.com)
 * @param password - Test user password (default: testpassword123)
 * @returns User ID and email
 */
export async function signInTestUser(
  page: Page,
  email = "test@example.com",
  password = "testpassword123",
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  // Create Supabase client for auth operations
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Try to sign in first (user might already exist)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If sign in fails, try to sign up (user doesn't exist)
  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      throw new Error(
        `Failed to create or sign in test user: ${signUpError.message}`,
      );
    }

    // After sign up, sign in to get the session
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error) {
      throw new Error(
        `Failed to sign in after sign up: ${signInResult.error.message}`,
      );
    }
  }

  // Get the session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Failed to get session after sign in");
  }

  // Set auth cookies in Playwright context
  // Supabase uses these cookie names for SSR
  await page.context().addCookies([
    {
      name: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ]);

  return {
    userId: session.user.id,
    email: session.user.email!,
  };
}

/**
 * Signs out the current user in Playwright context
 */
export async function signOut(page: Page) {
  // Clear all cookies
  await page.context().clearCookies();
}

