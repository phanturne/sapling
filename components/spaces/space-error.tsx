import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { validateReturnUrl } from "@/lib/utils/auth";
import { Lock } from "lucide-react";
import Link from "next/link";

type SpaceErrorProps = {
  isAuthenticated: boolean;
  returnUrl?: string;
};

export function SpaceError({ isAuthenticated, returnUrl }: SpaceErrorProps) {
  const safeReturnUrl = validateReturnUrl(returnUrl);
  const loginUrl = safeReturnUrl
    ? `/auth/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`
    : "/auth/login";

  return (
    <div className="flex h-dvh flex-col">
      <Navbar
        left={
          <Link
            href="/spaces"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Spaces
          </Link>
        }
      />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Space is private or does not exist
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? "You don't have access to this space. It may be private or may not exist."
                : "You need to log in to access this space. It may be private or may not exist."}
            </p>
          </div>
          {!isAuthenticated ? (
            <Button asChild>
              <Link href={loginUrl}>Log in</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/spaces">Go to Spaces</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
