import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-card text-card-foreground shadow-soft-lg rounded-xl border border-border p-8">
          {/* Logo/Branding */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center">
              <Image
                src="/icon-circle.png"
                alt="Sapling logo"
                width={64}
                height={64}
                className="h-16 w-16"
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Log in to your account
            </p>
          </div>

          {/* Error Message */}
          {error === "invalid_credentials" && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Invalid email or password. Please try again.
            </div>
          )}

          {/* Form */}
          <form action={login} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={6}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/auth/register"
                className="text-sm text-primary hover:underline"
              >
                Don&apos;t have an account? Sign up now
              </Link>
            </div>

            <Button type="submit" className="w-full h-11" size="lg">
              Log in
            </Button>
          </form>

          {/* Help Text */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Having trouble logging in?{" "}
            <Link
              href="/auth/reset-password"
              className="text-primary hover:underline"
            >
              Reset your password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}