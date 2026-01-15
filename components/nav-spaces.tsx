"use client"

import {
  Plus,
  Sparkles,
  Squircle
} from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type Space = {
  id: string
  name: string
}

type NavSpacesProps = {
  spaces: Space[]
  isAuthenticated?: boolean
}

export function NavSpaces({ spaces, isAuthenticated = true }: NavSpacesProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Spaces</SidebarGroupLabel>
      <SidebarMenu>
        {spaces.length > 0 ? (
          spaces.map((space) => (
            <SidebarMenuItem key={space.id}>
              <SidebarMenuButton asChild>
                <Link href={`/spaces/${space.id}`}>
                  <Squircle
                    className="h-4 w-4"
                    style={{ color: "var(--primary)", fill: "currentColor" }}
                  />
                  <span>{space.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <div className="px-2 py-1.5">
              {isAuthenticated ? (
                <div className="rounded-lg border border-dashed bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                  No spaces yet. Create your first space to get started.
                </div>
              ) : !isCollapsed ? (
                <div className="rounded-lg border border-dashed bg-card/40 px-3 py-2">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Sign in to create spaces</span>
                  </div>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Save your notebooks and keep track of what you&apos;re studying.
                  </p>
                  <SidebarMenuButton asChild className="h-auto px-2 py-1 text-[11px]">
                    <Link href="/auth/login">
                      <span>Get started</span>
                    </Link>
                  </SidebarMenuButton>
                </div>
              ) : null}
            </div>
          </SidebarMenuItem>
        )}
        {isAuthenticated && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/spaces/new">
                <Plus className="text-sidebar-foreground/70" />
                <span>New Space</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

