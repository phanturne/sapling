import { expect, test } from "@playwright/test";

import { signInTestUser, signOut } from "./helpers/auth";

test.describe("Spaces", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/spaces");

    await page.waitForURL("**/auth/login");

    expect(page.url()).toContain("/auth/login");
  });

  test("allows authenticated users to create a space", async ({ page }) => {
    await signInTestUser(page);

    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/spaces");

    // Click create space button
    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    // Fill in the form
    await page.getByLabel(/Title/i).fill("My Test Space");
    await page.getByLabel(/Description/i).fill("A test space for testing");
    await page.getByLabel(/Visibility/i).selectOption("private");

    // Submit the form
    await page.getByRole("button", { name: /Create Space/i }).click();

    // Should redirect to the new space page
    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });

    // Verify we're on the space page
    expect(page.url()).toMatch(/\/spaces\/[^/]+$/);

    // Clean up: sign out
    await signOut(page);
  });

  test("allows authenticated users to update a space", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Space to Update");
    await page.getByLabel(/Description/i).fill("Original description");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });

    // Open settings modal
    await page.getByRole("button", { name: /Space settings/i }).click();

    // Wait for modal to be visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Update the space - use the specific input IDs from the modal
    await page.getByLabel(/Title/i).fill("Updated Space Title");
    await page.getByLabel(/Description/i).fill("Updated description");
    await page.getByLabel(/Visibility/i).selectOption("public");

    // Submit the form
    await page.getByRole("button", { name: /Update/i }).click();

    // Verify toast notification appears
    await expect(
      page.getByText(/Space updated successfully/i),
    ).toBeVisible({ timeout: 5000 });

    // Wait for modal to close (dialog should not be visible)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });

    // Wait for page to refresh
    await page.waitForLoadState("networkidle");

    // Re-open modal to verify form values were updated
    await page.getByRole("button", { name: /Space settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    
    // Verify the updated values
    await expect(page.getByLabel(/Title/i)).toHaveValue("Updated Space Title");
    await expect(page.getByLabel(/Description/i)).toHaveValue(
      "Updated description",
    );

    await signOut(page);
  });

  test("allows authenticated users to delete a space", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Space to Delete");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });

    // Open settings modal first
    await page.getByRole("button", { name: /Space settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Delete the space
    await page.getByRole("button", { name: /Delete space/i }).click();

    // Verify toast notification appears
    await expect(
      page.getByText(/Space deleted successfully/i),
    ).toBeVisible({ timeout: 5000 });

    // Should redirect to home page (since /spaces redirects to /)
    await page.waitForURL("/", { timeout: 5000 });

    await signOut(page);
  });

  test("shows error when validation fails", async ({ page }) => {
    await signInTestUser(page);

    await page.goto("/spaces/new");
    await page.waitForLoadState("networkidle");

    // Submit with a title that's too long (exceeds 255 chars)
    // This will pass HTML5 validation but fail server validation
    const longTitle = "a".repeat(256);
    await page.getByLabel(/Title/i).fill(longTitle);
    await page.getByRole("button", { name: /Create Space/i }).click();

    // Should redirect with validation error - wait for navigation or check current URL
    await page.waitForLoadState("networkidle");
    const currentUrl = new URL(page.url());
    if (currentUrl.pathname !== "/spaces" || currentUrl.searchParams.get("error") !== "validation_failed") {
      await page.waitForURL(
        (url) => url.pathname === "/spaces" && url.searchParams.get("error") === "validation_failed",
        { timeout: 10000 },
      );
    }

    await expect(
      page.getByText(/Invalid input/i),
    ).toBeVisible();

    await signOut(page);
  });

  test("lists all user spaces", async ({ page }) => {
    await signInTestUser(page);

    // Create multiple spaces
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    // Create first space
    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Title/i).fill("First Space");
    await page.getByRole("button", { name: /Create Space/i }).click();
    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });

    // Go back to spaces list
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    // Create second space
    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Title/i).fill("Second Space");
    await page.getByRole("button", { name: /Create Space/i }).click();
    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });

    // Go back to spaces list
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    // Verify both spaces are listed (use getByRole to avoid duplicate text issues)
    await expect(page.getByRole("link", { name: "First Space" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Second Space" }).first()).toBeVisible();

    await signOut(page);
  });
});

