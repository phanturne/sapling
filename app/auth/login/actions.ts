"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateReturnUrl } from "@/lib/utils/auth";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const rawReturnUrl = formData.get("returnUrl") as string | null;
  const returnUrl = validateReturnUrl(rawReturnUrl);

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    const redirectUrl = returnUrl
      ? `/auth/login?error=invalid_credentials&returnUrl=${encodeURIComponent(returnUrl)}`
      : "/auth/login?error=invalid_credentials";
    redirect(redirectUrl);
  }

  revalidatePath("/", "layout");
  const finalUrl = returnUrl || "/";
  redirect(finalUrl);
}