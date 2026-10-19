// B2C checkout is paused; legacy callers lead to the free directory.

import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface PricingCTAProps {
  text?: string;
  variant?: "primary" | "outline";
  size?: "default" | "large";
  className?: string;
}

export default function PricingCTA({
  variant = "primary",
  size = "default",
  className = "",
}: PricingCTAProps) {
  const { t } = useLanguage();

  const baseStyles = "inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-200 group cursor-pointer hover:scale-[1.02] active:scale-[0.99]";
  const sizeStyles = size === "large"
    ? "px-8 py-4 text-base"
    : "px-6 py-3 text-sm";
  const variantStyles = variant === "primary"
    ? "bg-brand-green text-white hover:bg-brand-green-hover shadow-sm hover:shadow-md"
    : "border-2 border-brand-green text-brand-green hover:bg-brand-green hover:text-white";

  return (
    <Link href="/organizations?mc=FR"
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {t.hero.cta}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
