/*
 * AnimatedNumber — count-up tween from 0 → target when the component
 * scrolls into view. Used for Google rating + review count in the
 * TrustPanel so the page feels alive. Respects prefers-reduced-motion
 * via framer-motion's internal guard.
 */

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue } from "framer-motion";

interface Props {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 900,
  className,
  suffix,
  prefix,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const motion = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motion, value, {
      duration: durationMs / 1000,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [inView, value, durationMs, motion]);

  useEffect(() => {
    const unsub = motion.on("change", (v) => {
      const el = ref.current;
      if (!el) return;
      el.textContent = `${prefix ?? ""}${v.toFixed(decimals)}${suffix ?? ""}`;
    });
    return unsub;
  }, [motion, decimals, prefix, suffix]);

  const fallback = `${prefix ?? ""}${value.toFixed(decimals)}${suffix ?? ""}`;
  return (
    <span ref={ref} className={className} aria-label={fallback}>
      {fallback}
    </span>
  );
}
