import { expect, test } from "@playwright/test";

/**
 * Example E2E tests for authentication flows.
 * 
 * These tests use ACTUAL auth forms (not helpers) because:
 * 1. We're testing the auth flow itself
 * 2. We need to verify UI behavior (error messages, validation)
 * 3. We want to test the complete user journey
 */
test.describe("Authentication", () => {
  test("login form shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill login form like a real user
    await page.getByLabel(/Email/i).fill("wrong@example.com");
    await page.getByLabel(/Password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /Log in/i }).click();

    // Verify error handling - should redirect back to login with error param
    await page.waitForURL("**/auth/login?error=invalid_credentials");
    await expect(
      page.getByText(/Invalid email or password/i),
    ).toBeVisible();
  });

  test("login form validates required fields", async ({ page }) => {
    await page.goto("/auth/login");

    // Try to submit empty form
    await page.getByRole("button", { name: /Log in/i }).click();

    // HTML5 validation should prevent submission
    // Or your app might show validation errors
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toBeFocused(); // Browser focuses first invalid field
  });

  test("successful login redirects to home", async ({ page }) => {
    // Create a test user first using the helper
    const { signInTestUser } = await import("./helpers/auth");
    await signInTestUser(page, "test@example.com", "testpassword123");

    // Now sign out and test the login flow
    await page.context().clearCookies();
    
    await page.goto("/auth/login");

    // Fill login form with valid credentials
    await page.getByLabel(/Email/i).fill("test@example.com");
    await page.getByLabel(/Password/i).fill("testpassword123");
    await page.getByRole("button", { name: /Log in/i }).click();

    // Verify redirect to home
    await page.waitForURL("**/");
    expect(page.url()).not.toContain("/auth/login");
  });
});

