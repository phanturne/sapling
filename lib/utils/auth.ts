/**
 * Validates that a returnUrl is a safe relative path.
 * Only allows paths starting with '/' to prevent open redirect vulnerabilities.
 *
 * Security checks:
 * - Must start with '/' (relative path only, rejects http://, https://, javascript:, etc.)
 * - Must not contain '//' anywhere (prevents protocol-relative URLs like //evil.com)
 *   This check is performed on both the encoded and decoded URL
 *
 * @param returnUrl - The URL to validate
 * @returns The validated relative path, or null if invalid
 */
export function validateReturnUrl(
  returnUrl: string | null | undefined
): string | null {
  if (!returnUrl) {
    return null;
  }

  // Must be a non-empty string
  if (typeof returnUrl !== "string") {
    return null;
  }

  const trimmed = returnUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Must start with '/' to be a relative path
  // This rejects absolute URLs (http://, https://, javascript:, data:, etc.)
  if (!trimmed.startsWith("/")) {
    return null;
  }

  // Reject URLs containing '//' anywhere (prevents protocol-relative URLs)
  // Check both encoded and decoded forms to catch attacks like "/%2F%2Fevil.com"
  if (trimmed.includes("//")) {
    return null;
  }

  // Also check decoded form
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.includes("//")) {
      return null;
    }
  } catch {
    // If decoding fails, reject the URL
    return null;
  }

  return trimmed;
}
