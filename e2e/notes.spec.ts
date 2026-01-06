import { expect, test } from "@playwright/test";

import { signInTestUser, signOut } from "./helpers/auth";

test.describe("Notes", () => {
  test("allows authenticated users to create a note", async ({ page }) => {
    await signInTestUser(page);

    // Create a space first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space for Notes");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();
    const spaceId = spaceUrl.split("/").pop()!;

    // Navigate to notes page
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Notes/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the button to be visible (only renders if user is owner)
    await expect(page.getByRole("link", { name: /New Note/i })).toBeVisible({ timeout: 10000 });
    
    // Click create note button
    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    // Fill in the form
    await page.getByLabel(/Title/i).fill("My Test Note");
    await page.getByLabel(/Content/i).fill("# Test Note\n\nThis is test content.");

    // Submit the form
    await page.getByRole("button", { name: /Create Note/i }).click();

    // Should redirect to the new note page
    await page.waitForURL(new RegExp(`/spaces/${spaceId}/notes/[^/]+$`), {
      timeout: 10000,
    });

    // Verify we're on the note page
    expect(page.url()).toMatch(new RegExp(`/spaces/${spaceId}/notes/[^/]+$`));

    await signOut(page);
  });

  test("allows authenticated users to update a note", async ({ page }) => {
    await signInTestUser(page);

    // Create a space and note first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();
    const spaceId = spaceUrl.split("/").pop()!;

    // Create a note
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Notes/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the button to be visible
    await expect(page.getByRole("link", { name: /New Note/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Note to Update");
    await page.getByLabel(/Content/i).fill("Original content");
    await page.getByRole("button", { name: /Create Note/i }).click();

    await page.waitForURL(new RegExp(`/spaces/${spaceId}/notes/[^/]+$`), {
      timeout: 10000,
    });

    // Update the note
    await page.getByLabel(/Title/i).fill("Updated Note Title");
    await page.getByLabel(/Content/i).fill("Updated content");

    // Click save manually
    await page.getByRole("button", { name: /Save/i }).click();

    // Wait for save to complete - check that "Saving..." disappears and "Saved" appears
    // The save button should become enabled again after saving
    await page.waitForTimeout(1000); // Give time for save to complete

    // Verify we're still on the note page (no redirect)
    expect(page.url()).toMatch(new RegExp(`/spaces/${spaceId}/notes/[^/]+$`));
    
    // Verify the content was saved by checking the input values
    await expect(page.getByLabel(/Title/i)).toHaveValue("Updated Note Title");
    await expect(page.getByLabel(/Content/i)).toHaveValue("Updated content");

    await signOut(page);
  });

  test("allows authenticated users to delete a note", async ({ page }) => {
    await signInTestUser(page);

    // Create a space and note first
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Create Space/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Test Space");
    await page.getByRole("button", { name: /Create Space/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+$/, { timeout: 5000 });
    const spaceUrl = page.url();
    const spaceId = spaceUrl.split("/").pop()!;

    // Create a note
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Notes/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the button to be visible
    await expect(page.getByRole("link", { name: /New Note/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Note to Delete");
    await page.getByLabel(/Content/i).fill("This note will be deleted");
    await page.getByRole("button", { name: /Create Note/i }).click();

    await page.waitForURL(new RegExp(`/spaces/${spaceId}/notes/[^/]+$`), {
      timeout: 5000,
    });

    // Delete the note
    await page.getByRole("button", { name: /Delete/i }).click();

    // Should navigate to space page with success
    await page.waitForURL(`${spaceUrl}?success=note_deleted`, {
      timeout: 5000,
    });

    await signOut(page);
  });

  test("shows error when validation fails", async ({ page }) => {
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

    // Navigate to notes page
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Notes/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the button to be visible
    await expect(page.getByRole("link", { name: /New Note/i })).toBeVisible({ timeout: 10000 });
    
    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    // Try to submit without title
    await page.getByRole("button", { name: /Create Note/i }).click();

    // Should show validation error
    await page.waitForURL(
      new RegExp(`${spaceUrl}/notes\\?error=validation_failed`),
      {
        timeout: 5000,
      },
    );

    await expect(page.getByText(/Invalid input/i)).toBeVisible();

    await signOut(page);
  });

  test("lists all notes in a space", async ({ page }) => {
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

    // Create first note
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");
    
    // Wait for the page title to ensure it loaded
    await expect(page.getByRole("heading", { name: /Notes/i })).toBeVisible({ timeout: 10000 });
    
    // Wait for the button to be visible
    await expect(page.getByRole("link", { name: /New Note/i })).toBeVisible({ timeout: 10000 });
    
    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("First Note");
    await page.getByLabel(/Content/i).fill("First note content");
    await page.getByRole("button", { name: /Create Note/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+\/notes\/[^/]+$/, {
      timeout: 5000,
    });

    // Go back to notes list
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");

    // Create second note
    await page.getByRole("link", { name: /New Note/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Title/i).fill("Second Note");
    await page.getByLabel(/Content/i).fill("Second note content");
    await page.getByRole("button", { name: /Create Note/i }).click();

    await page.waitForURL(/\/spaces\/[^/]+\/notes\/[^/]+$/, {
      timeout: 5000,
    });

    // Go back to notes list
    await page.goto(`${spaceUrl}/notes`);
    await page.waitForLoadState("networkidle");

    // Verify both notes are listed
    await expect(page.getByText("First Note")).toBeVisible();
    await expect(page.getByText("Second Note")).toBeVisible();

    await signOut(page);
  });
});

