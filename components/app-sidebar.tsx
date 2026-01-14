"use client"

import {
  Home,
  Shapes,
  Sprout,
  Telescope,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSpaces } from "@/components/nav-spaces"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
  user: {
    name: string | null
    email: string
    avatar: string | null
  }
  spaces: {
    id: string
    name: string
  }[]
}

export function AppSidebar({
  user,
  spaces,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const pathname = usePathname()
  const isAuthRoute =
    pathname === "/auth" || pathname.startsWith("/auth/")
  const [isHovered, setIsHovered] = React.useState(false)

  const showExpandTrigger = state === "collapsed" && isHovered

  React.useEffect(() => {
    // Edge case: collapsing while hovered won't fire onMouseLeave, so reset hover.
    if (state === "collapsed") {
      setIsHovered(false)
    }
  }, [state])

  const navMain = [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Spaces",
      url: "/spaces",
      icon: Shapes,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Telescope,
    },
  ].map((item) => ({
    ...item,
    isActive:
      item.url === "/"
        ? pathname === "/"
        : pathname === item.url || pathname.startsWith(`${item.url}/`),
  }))

  // Hide sidebar entirely on auth routes
  if (isAuthRoute) {
    return null
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:justify-center hover:bg-transparent active:bg-transparent focus-visible:bg-transparent data-[active=true]:bg-transparent"
              asChild
            >
              <div className="flex items-center gap-2">
                <div className="relative flex aspect-square size-8 items-center justify-center">
                  {showExpandTrigger ? (
                    <SidebarTrigger className="absolute inset-0 h-8 w-8 rounded-lg text-sidebar-primary-foreground" />
                  ) : (
                    <Link
                      href="/"
                      aria-label="Go to Dashboard"
                      className="absolute inset-0 flex items-center justify-center rounded-lg text-sidebar-primary-foreground bg-sidebar-primary"
                    >
                      <Sprout className="size-4" />
                    </Link>
                  )}
                </div>
                <div className="flex flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
                  <Link href="/" className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Sapling</span>
                  </Link>
                  {state === "expanded" ? (
                    <SidebarTrigger
                      aria-label="Collapse Sidebar"
                      className="text-muted-foreground hover:text-foreground"
                    />
                  ) : null}
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSpaces spaces={spaces} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
