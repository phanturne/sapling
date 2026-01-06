import { expect, test } from "@playwright/test";

import { signInTestUser, signOut } from "./helpers/auth";

test.describe("Sources", () => {
  test("allows authenticated users to upload a file source", async ({
    page,
  }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space for Sources");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Navigate to sources page
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Upload File/i })).toBeVisible({ timeout: 10000 });

    // Create a test file
    const testFileContent = "This is a test file content.";

    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    await page.getByLabel(/Title/i).fill("Test File Source");
    await page.getByLabel(/File/i).setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(testFileContent),
    });

    await page.getByRole("button", { name: /Upload/i }).click();

    // Wait for navigation or success message/source to appear
    // The component navigates client-side, so wait for either the URL change or the source to appear
    await Promise.race([
      page.waitForURL(
        (url) => url.pathname === `${new URL(spaceUrl).pathname}/sources` && url.searchParams.get("success") === "1",
        { timeout: 10000 },
      ),
      expect(page.getByText("Test File Source")).toBeVisible({ timeout: 10000 }),
    ]);

    await signOut(page);
  });

  test("allows authenticated users to add a URL source", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Navigate to sources page
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Sources/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Add URL/i })).toBeVisible({ timeout: 10000 });

    // Add URL source
    await page.getByRole("button", { name: /Add URL/i }).click();
    await page.getByLabel(/Title/i).fill("Test Article");
    await page.getByLabel(/URL/i).fill("https://example.com/article");

    await page.getByRole("button", { name: /Add URL/i }).click();

    // Wait for navigation or source to appear
    await Promise.race([
      page.waitForURL(
        (url) => url.pathname === `${new URL(spaceUrl).pathname}/sources` && url.searchParams.get("success") === "1",
        { timeout: 10000 },
      ),
      expect(page.getByText("Test Article")).toBeVisible({ timeout: 10000 }),
    ]);

    await signOut(page);
  });

  test("allows authenticated users to delete a source", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Create a URL source first
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Sources/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Add URL/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Add URL/i }).click();
    await page.getByLabel(/Title/i).fill("Source to Delete");
    await page.getByLabel(/URL/i).fill("https://example.com/article");
    await page.getByRole("button", { name: /Add URL/i }).click();

    // Wait for source to appear or URL change
    await Promise.race([
      page.waitForURL(
        (url) => url.pathname === `${new URL(spaceUrl).pathname}/sources` && url.searchParams.get("success") === "1",
        { timeout: 10000 },
      ),
      expect(page.getByText("Source to Delete")).toBeVisible({ timeout: 10000 }),
    ]);

    // Click on the source to view it
    await page.getByText("Source to Delete").click();
    await page.waitForLoadState("networkidle");

    // Delete the source
    await page.getByRole("button", { name: /Delete/i }).click();

    // Should redirect to sources list with success
    await page.waitForURL(`${spaceUrl}/sources?success=deleted`, {
      timeout: 5000,
    });

    await signOut(page);
  });

  test("shows error when file type is invalid", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Navigate to sources page
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Sources/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Upload File/i })).toBeVisible({ timeout: 10000 });

    // Try to upload invalid file type
    const testFileContent = "This is a test file content.";
    await page.getByRole("button", { name: /Upload File/i }).click();
    await page.getByLabel(/File/i).setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(testFileContent),
    });

    await page.getByRole("button", { name: /Upload/i }).click();

    // Should show error
    await page.waitForURL(
      new RegExp(`${spaceUrl}/sources\\?error=invalid_file_type`),
      {
        timeout: 5000,
      },
    );

    await signOut(page);
  });

  test("shows error when URL is invalid", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Navigate to sources page
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Sources/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Add URL/i })).toBeVisible({ timeout: 10000 });

    // Try to add invalid URL
    await page.getByRole("button", { name: /Add URL/i }).click();
    await page.getByLabel(/URL/i).fill("not-a-valid-url");

    await page.getByRole("button", { name: /Add URL/i }).click();

    // Should show error
    await page.waitForURL(
      new RegExp(`${spaceUrl}/sources\\?error=invalid_url`),
      {
        timeout: 5000,
      },
    );

    await signOut(page);
  });

  test("lists all sources in a space", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();

    // Create first source (URL)
    await page.goto(`${spaceUrl}/sources`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Sources/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the upload component to be ready
    await expect(page.getByRole("button", { name: /Add URL/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Add URL/i }).click();
    await page.getByLabel(/Title/i).fill("First Source");
    await page.getByLabel(/URL/i).fill("https://example.com/first");
    await page.getByRole("button", { name: /Add URL/i }).click();

    // Wait for first source to appear or URL change
    await Promise.race([
      page.waitForURL(
        (url) => url.pathname === `${new URL(spaceUrl).pathname}/sources` && url.searchParams.get("success") === "1",
        { timeout: 10000 },
      ),
      expect(page.getByText("First Source")).toBeVisible({ timeout: 10000 }),
    ]);

    // Create second source (URL)
    await page.getByRole("button", { name: /Add URL/i }).click();
    await page.getByLabel(/Title/i).fill("Second Source");
    await page.getByLabel(/URL/i).fill("https://example.com/second");
    await page.getByRole("button", { name: /Add URL/i }).click();

    // Wait for second source to appear or URL change
    await Promise.race([
      page.waitForURL(
        (url) => url.pathname === `${new URL(spaceUrl).pathname}/sources` && url.searchParams.get("success") === "1",
        { timeout: 10000 },
      ),
      expect(page.getByText("Second Source")).toBeVisible({ timeout: 10000 }),
    ]);

    // Verify both sources are listed
    await expect(page.getByText("First Source")).toBeVisible();
    await expect(page.getByText("Second Source")).toBeVisible();

    await signOut(page);
  });
});

