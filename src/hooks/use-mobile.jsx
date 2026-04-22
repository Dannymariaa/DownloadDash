import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    if (!window.matchMedia) {
      update()
      window.addEventListener("resize", update)
      return () => window.removeEventListener("resize", update)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = update

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else if (mql.addListener) {
      mql.addListener(onChange)
    }

    update()
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else if (mql.removeListener) {
        mql.removeListener(onChange)
      }
    }
  }, [])

  return !!isMobile
}
