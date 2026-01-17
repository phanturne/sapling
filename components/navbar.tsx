import { cn } from "@/lib/utils"
import * as React from "react"

type NavbarProps = {
  left?: React.ReactNode
  middle?: React.ReactNode
  right?: React.ReactNode
  className?: string
  sticky?: boolean
}

export function Navbar({
  left,
  middle,
  right,
  className,
  sticky = false,
}: NavbarProps) {
  const hasMiddle = Boolean(middle)
  const gridCols = hasMiddle ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-[1fr_1fr]"

  return (
    <nav
      className={cn(
        "grid h-14 items-center gap-4 border-b border-border bg-background px-4",
        gridCols,
        sticky && "sticky top-0 z-50",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2" data-slot="navbar-left">
        {left}
      </div>

      {hasMiddle && (
        <div
          className="flex items-center justify-center gap-4"
          data-slot="navbar-middle"
        >
          {middle}
        </div>
      )}

      <div
        className="flex min-w-0 items-center justify-end gap-2"
        data-slot="navbar-right"
      >
        {right}
      </div>
    </nav>
  )
}

