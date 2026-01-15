import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from "@/utils/supabase/server"

type AppSidebarWrapperProps = Omit<
  React.ComponentProps<typeof AppSidebar>,
  "user" | "spaces"
>

export async function AppSidebarWrapper(props: AppSidebarWrapperProps) {
  const supabase = await createClient()

  // Get user data
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    // Show sidebar for unauthenticated users with null user and empty spaces
    return (
      <AppSidebar
        user={null}
        spaces={[]}
        {...props}
      />
    )
  }

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", authUser.id)
    .single()

  // Get user's spaces (limited to 5 most recent)
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, title")
    .eq("user_id", authUser.id)
    .order("updated_at", { ascending: false })
    .limit(5)

  const user = {
    name: profile?.display_name || null,
    email: authUser.email || "",
    avatar: profile?.avatar_url || null,
  }

  return (
    <AppSidebar
      user={user}
      spaces={(spaces || []).map((space) => ({
        id: space.id,
        name: space.title,
      }))}
      {...props}
    />
  )
}

