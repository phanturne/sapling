import { SpacesHome } from "@/components/spaces/spaces-home";
import { createClient } from "@/utils/supabase/server";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = (await searchParams) ?? {};
  const rawPanel =
    typeof params.panel === "string" ? params.panel : null;

  const activePanel =
    rawPanel === "all" || rawPanel === "my-spaces" || rawPanel === "featured"
      ? rawPanel
      : "all";

  // Fetch all panel data in parallel for instant tab switching
  const [
    featuredSpacesResult,
    mySpacesResult,
    allPublicSpacesResult,
  ] = await Promise.all([
    // Featured spaces (public spaces, limited to 12)
    supabase
      .from("spaces")
      .select("*")
      .eq("visibility", "public")
      .order("updated_at", { ascending: false })
      .limit(12),
    // User's spaces (empty if not authenticated)
    user
      ? supabase
          .from("spaces")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    // All public spaces for Featured Spaces tab
    supabase
      .from("spaces")
      .select("*")
      .eq("visibility", "public")
      .order("updated_at", { ascending: false }),
  ]);

  // Recent spaces = user's own spaces (since we don't track views)
  // For unauthenticated users, this will be empty
  const recentSpaces = mySpacesResult.data || [];

  return (
    <SpacesHome
      initialPanel={activePanel}
      initialData={{
        featuredSpaces: featuredSpacesResult.data || [],
        recentSpaces,
        mySpaces: mySpacesResult.data || [],
        allPublicSpaces: allPublicSpacesResult.data || [],
      }}
      isAuthenticated={!!user}
    />
  );
}
