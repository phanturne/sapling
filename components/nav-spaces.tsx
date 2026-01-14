"use client"

import {
  Plus,
  Squircle
} from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type Space = {
  id: string
  name: string
}

export function NavSpaces({ spaces }: { spaces: Space[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Spaces</SidebarGroupLabel>
      <SidebarMenu>
        {spaces.map((space) => (
          <SidebarMenuItem key={space.id}>
            <SidebarMenuButton asChild>
              <Link href={`/spaces/${space.id}`}>
                <Squircle />
                <span>{space.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/spaces/new">
              <Plus className="text-sidebar-foreground/70" />
              <span>New Space</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

