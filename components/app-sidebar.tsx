"use client"

import {
  Home,
  Sprout
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

const SPACES_SIDEBAR_PREFERENCE_COOKIE = "sidebar_spaces_preference"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

type SidebarPreference = "open" | "closed" | null

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null
  return null
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`
}

type SpacesAwareSidebarTriggerProps = React.ComponentProps<typeof SidebarTrigger> & {
  onManualToggle?: (willBeOpen: boolean) => void
}

function SpacesAwareSidebarTrigger({
  onManualToggle,
  onClick,
  ...props
}: SpacesAwareSidebarTriggerProps) {
  const { open } = useSidebar()
  return (
    <SidebarTrigger
      onClick={(event) => {
        onClick?.(event)
        // Toggle will invert the current state
        onManualToggle?.(!open)
      }}
      {...props}
    />
  )
}

type SpacesAwareSidebarRailProps = React.ComponentProps<typeof SidebarRail> & {
  onManualToggle?: (willBeOpen: boolean) => void
}

function SpacesAwareSidebarRail({
  onManualToggle,
  onClick,
  ...props
}: SpacesAwareSidebarRailProps) {
  const { open } = useSidebar()
  return (
    <SidebarRail
      onClick={(event) => {
        onClick?.(event)
        // Toggle will invert the current state
        onManualToggle?.(!open)
      }}
      {...props}
    />
  )
}

type AppSidebarProps = {
  user: {
    name: string | null
    email: string
    avatar: string | null
  } | null
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
  const { state, open, setOpen } = useSidebar()
  const pathname = usePathname()
  const isAuthRoute =
    pathname === "/auth" || pathname.startsWith("/auth/")
  const isSpacesPage = pathname === "/spaces" || pathname.startsWith("/spaces/")
  const [isHovered, setIsHovered] = React.useState(false)
  const [preference, setPreference] = React.useState<SidebarPreference>(() => {
    if (typeof document === "undefined") return null
    const cookieValue = getCookie(SPACES_SIDEBAR_PREFERENCE_COOKIE)
    return cookieValue === "open" || cookieValue === "closed" ? cookieValue : null
  })
  const isAutoCollapsingRef = React.useRef(false)

  const showExpandTrigger = state === "collapsed" && isHovered

  // Apply saved preference or auto-collapse on spaces page
  React.useEffect(() => {
    if (isSpacesPage) {
      if (preference === "closed") {
        // User prefers it closed, keep it closed
        if (open) {
          isAutoCollapsingRef.current = true
          setOpen(false)
        }
      } else if (preference === "open") {
        // User prefers it open, keep it open
        if (!open) {
          setOpen(true)
        }
      } else {
        // No preference saved, auto-collapse (default behavior)
        if (open) {
          isAutoCollapsingRef.current = true
          setOpen(false)
        }
      }
    }
    // Reset the flag after a brief delay
    const timeoutId = setTimeout(() => {
      isAutoCollapsingRef.current = false
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [isSpacesPage, preference, open, setOpen])

  // Track when user manually changes sidebar state on spaces page
  const handleManualToggle = React.useCallback(
    (willBeOpen: boolean) => {
      if (isSpacesPage && !isAutoCollapsingRef.current) {
        const newPreference: SidebarPreference = willBeOpen ? "open" : "closed"
        setPreference(newPreference)
        setCookie(SPACES_SIDEBAR_PREFERENCE_COOKIE, newPreference)
      }
    },
    [isSpacesPage]
  )

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
    // {
    //   title: "Spaces",
    //   url: "/spaces",
    //   icon: Shapes,
    // },
    // {
    //   title: "Explore",
    //   url: "/explore",
    //   icon: Telescope,
    // },
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
                    <SpacesAwareSidebarTrigger
                      onManualToggle={handleManualToggle}
                      className="absolute inset-0 h-8 w-8 rounded-lg text-sidebar-primary-foreground"
                    />
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
                    <SpacesAwareSidebarTrigger
                      onManualToggle={handleManualToggle}
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
        <NavSpaces spaces={spaces} isAuthenticated={!!user} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ?? null} />
      </SidebarFooter>
      <SpacesAwareSidebarRail onManualToggle={handleManualToggle} />
    </Sidebar>
  )
}
