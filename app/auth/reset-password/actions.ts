"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password/update`,
  });

  if (error) {
    redirect("/error");
  }

  // Redirect to confirmation page with email
  redirect(`/auth/reset-password/confirm?email=${encodeURIComponent(email)}`);
}

