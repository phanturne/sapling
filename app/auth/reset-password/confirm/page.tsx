import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import Link from "next/link";

interface ResetPasswordConfirmPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ResetPasswordConfirmPage({
  searchParams,
}: ResetPasswordConfirmPageProps) {
  const params = await searchParams;
  const email = params.email || "";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-card text-card-foreground shadow-soft-lg rounded-xl border border-border p-8">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to
            </p>
            {email && (
              <p className="mb-6 font-medium text-foreground">{email}</p>
            )}
            <div className="space-y-4 rounded-lg bg-muted/50 p-4 text-left text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Next steps:</strong>
              </p>
              <ol className="ml-4 list-decimal space-y-2 text-muted-foreground">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the password reset link in the email</li>
                <li>Enter your new password</li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button asChild className="w-full h-11" size="lg">
              <Link href="/auth/login">Back to login</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive the email?{" "}
              <Link
                href="/auth/reset-password"
                className="text-primary hover:underline"
              >
                Try again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

