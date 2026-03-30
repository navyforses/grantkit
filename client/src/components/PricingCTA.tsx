/*
 * PricingCTA Component
 * Design: Structured Clarity — vivid green CTA button with Paddle checkout overlay
 * Now auth-aware: redirects to login if not authenticated, opens Paddle if authenticated
 */

import { ArrowRight } from "lucide-react";
import { openPaddleCheckout } from "@/hooks/usePaddle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

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
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const activateMutation = trpc.subscription.activate.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.subscription.status.invalidate();
      // Redirect to catalog after successful payment
      window.location.href = "/catalog";
    },
  });

  const baseStyles = "inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 group cursor-pointer";
  const sizeStyles = size === "large"
    ? "px-8 py-4 text-base"
    : "px-6 py-3 text-sm";
  const variantStyles = variant === "primary"
    ? "bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-sm hover:shadow-md"
    : "border-2 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white";

  const handleClick = () => {
    if (!isAuthenticated) {
      // Redirect to login first, then come back
      window.location.href = getLoginUrl();
      return;
    }

    // User is logged in, open Paddle checkout
    openPaddleCheckout(
      language,
      user?.email || undefined,
      (data) => {
        // On successful payment, activate subscription in our DB
        activateMutation.mutate({
          paddleCustomerId: data.customerId,
          paddleSubscriptionId: data.subscriptionId,
          transactionId: data.transactionId,
        });
      }
    );
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {text}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
