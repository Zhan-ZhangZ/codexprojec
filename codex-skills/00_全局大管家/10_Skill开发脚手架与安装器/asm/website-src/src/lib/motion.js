/** Safe in SSR and jsdom (no matchMedia / IntersectionObserver). */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canUseIntersectionObserver() {
  return (
    typeof window !== "undefined" && typeof IntersectionObserver === "function"
  );
}
