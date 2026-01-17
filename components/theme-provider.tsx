"use client"

import * as React from "react"

type Theme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "sapling-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize theme from the already-applied class on documentElement
  // This avoids flicker since the script in layout.tsx applies the theme before React hydrates
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const root = window.document.documentElement
    if (root.classList.contains("dark")) return "dark"
    if (root.classList.contains("light")) return "light"
    // Fallback: read from localStorage synchronously
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme | null
      if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme
      }
    } catch {
      // localStorage might not be available
    }
    return defaultTheme
  })

  // Persist and apply theme whenever it changes
  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

