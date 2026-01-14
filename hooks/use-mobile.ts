import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to `false` so server and initial client render match.
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      // In non-browser environments, keep the default value.
      return
    }

    const mql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    )

    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    // Initialize from the current media query result.
    setIsMobile(mql.matches)

    mql.addEventListener("change", onChange)

    return () => {
      mql.removeEventListener("change", onChange)
    }
  }, [])

  return isMobile
}
