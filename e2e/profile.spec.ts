import { expect, test } from "@playwright/test";

import { signInTestUser, signOut } from "./helpers/auth";

test.describe("Profile page", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/profile");

    await page.waitForURL("**/auth/login");

    expect(page.url()).toContain("/auth/login");
  });

  test("allows authenticated users to update profile", async ({ page }) => {
    // Sign in a test user
    await signInTestUser(page);

    // Navigate to profile page
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Verify we're on the profile page (not redirected)
    expect(page.url()).toContain("/profile");

    // Fill in profile form
    await page.getByLabel(/Display name/i).fill("Updated Name");
    await page.getByLabel(/Username/i).fill("updatedusername");

    // Submit the form
    await page.getByRole("button", { name: /Save changes/i }).click();

    // Wait for success message or redirect with success param
    await page.waitForURL("**/profile?success=1", { timeout: 5000 });

    // Verify success message appears
    await expect(
      page.getByText(/Profile updated successfully/i),
    ).toBeVisible();

    // Verify form values were updated
    await expect(page.getByLabel(/Display name/i)).toHaveValue(
      "Updated Name",
    );
    await expect(page.getByLabel(/Username/i)).toHaveValue("updatedusername");

    // Clean up: sign out
    await signOut(page);
  });

  test("shows error when username is already taken", async ({ page }) => {
    // Create first user
    await signInTestUser(page, "user1@example.com");

    await page.goto("/profile");
    await page.getByLabel(/Username/i).fill("takenusername");
    await page.getByRole("button", { name: /Save changes/i }).click();
    await page.waitForURL("**/profile?success=1");

    await signOut(page);

    // Create second user and try to use same username
    await signInTestUser(page, "user2@example.com");

    await page.goto("/profile");
    await page.getByLabel(/Username/i).fill("takenusername");
    await page.getByRole("button", { name: /Save changes/i }).click();

    // Should show error
    await page.waitForURL("**/profile?error=username_taken");
    await expect(
      page.getByText(/That username is already taken/i),
    ).toBeVisible();

    await signOut(page);
  });
});
