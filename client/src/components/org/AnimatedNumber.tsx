/*
 * AnimatedNumber — count-up tween from `from` → `to` whenever the
 * component scrolls into view. Used for the Google rating and review
 * count in the trust panel so the page feels alive on scroll.
 *
 * Uses framer-motion's `useInView` + `useMotionValue` / `animate` so
 * the tween is interruptible and respects prefers-reduced-motion
 * (framer-motion guards this internally).
 */

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue } from "framer-motion";

interface Props {
  value: number;
  decimals?: number;           // e.g. 1 → "4.7"
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
