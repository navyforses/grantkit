/*
 * PricingCTA Component
 * Design: Structured Clarity — vivid green CTA button with consistent styling
 */

import { ArrowRight } from "lucide-react";
import { GUMROAD_URL } from "@/lib/constants";

interface PricingCTAProps {
  text?: string;
  variant?: "primary" | "outline";
  size?: "default" | "large";
  className?: string;
}

export default function PricingCTA({
  text = "Get Access — $9/month",
  variant = "primary",
  size = "default",
  className = "",
}: PricingCTAProps) {
  const baseStyles = "inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 group";
  const sizeStyles = size === "large"
    ? "px-8 py-4 text-base"
    : "px-6 py-3 text-sm";
  const variantStyles = variant === "primary"
    ? "bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-sm hover:shadow-md"
    : "border-2 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white";

  return (
    <a
      href={GUMROAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {text}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}
