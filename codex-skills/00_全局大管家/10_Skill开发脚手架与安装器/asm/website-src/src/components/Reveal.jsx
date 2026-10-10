import { cn } from "../lib/cn.js";
import { useInViewReveal } from "../hooks/useInViewReveal.js";

/**
 * Scroll-triggered section reveal. Children in `.lp-stagger` get a short cascade.
 */
export default function Reveal({
  children,
  className,
  stagger = false,
  immediate = false,
  delay = 0,
  as: Component = "div",
}) {
  const { ref, visible } = useInViewReveal({ immediate });
  return (
    <Component
      ref={ref}
      className={cn(
        "lp-reveal",
        stagger && "lp-stagger",
        visible && "is-visible",
        className,
      )}
      style={delay ? { "--lp-reveal-delay": `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
