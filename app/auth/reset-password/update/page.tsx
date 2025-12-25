import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePassword } from "./actions";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated (no valid reset session), redirect to request page
  if (!user) {
    redirect("/auth/reset-password");
  }

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
              Set new password
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form action={updatePassword} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                placeholder="••••••••"
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" size="lg">
              Update password
            </Button>
          </form>

          {/* Help Text */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

