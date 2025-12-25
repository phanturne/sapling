import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { resetPassword } from "./actions";

export default function ResetPasswordPage() {
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
                alt="nextjs-supabase-template logo"
                width={64}
                height={64}
                className="h-16 w-16"
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter your email to receive a password reset link
            </p>
          </div>

          {/* Form */}
          <form action={resetPassword} className="space-y-5">
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

            <Button type="submit" className="w-full h-11" size="lg">
              Send reset link
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

