import * as React from "react";

const TABLET_MIN_BREAKPOINT = 768;
const TABLET_MAX_BREAKPOINT = 1024;

/**
 * Hook to detect if the current viewport is a tablet (768px - 1024px)
 * @returns boolean indicating if viewport is tablet-sized
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= TABLET_MIN_BREAKPOINT && width <= TABLET_MAX_BREAKPOINT);
    };

    // Initial check
    checkTablet();

    // Listen for resize events
    const mql = window.matchMedia(
      `(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT}px)`
    );
    
    const handleChange = () => {
      checkTablet();
    };

    // Use both media query listener and resize listener for better compatibility
    mql.addEventListener("change", handleChange);
    window.addEventListener("resize", checkTablet);

    return () => {
      mql.removeEventListener("change", handleChange);
      window.removeEventListener("resize", checkTablet);
    };
  }, []);

  return !!isTablet;
}
