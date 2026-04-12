/*
 * OnboardingModal — Welcome modal for first-time authenticated users
 * Shows 3 steps to get started, then marks onboarding as completed in DB
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Bookmark, ExternalLink, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

export default function OnboardingModal() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const completeMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => {
      // Also mark in localStorage to prevent showing again even before page refresh
      localStorage.setItem("grantkit_onboarding_done", "true");
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check if onboarding already completed
    const localDone = localStorage.getItem("grantkit_onboarding_done");
    if (localDone === "true") return;

    // Check server-side flag
    if (user.onboardingCompleted) {
      localStorage.setItem("grantkit_onboarding_done", "true");
      return;
    }

    // Show the modal with a slight delay for better UX
    const timer = setTimeout(() => setIsOpen(true), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  const handleClose = () => {
    setIsOpen(false);
    completeMutation.mutate();
  };

  const handleGetStarted = () => {
    setIsOpen(false);
    completeMutation.mutate();
    window.location.href = "/catalog";
  };

  const steps = [
    { icon: BookOpen, text: t.onboarding.step1, color: "bg-blue-50 text-blue-600" },
    { icon: Bookmark, text: t.onboarding.step2, color: "bg-green-50 text-green-600" },
    { icon: ExternalLink, text: t.onboarding.step3, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-green via-primary to-brand-green" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-brand-green/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t.onboarding.welcomeTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.onboarding.welcomeSubtitle}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.15 }}
                  className="flex items-start gap-4"
                >
                  <div className={`w-10 h-10 ${step.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2">{step.text}</p>
                </motion.div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGetStarted}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-hover transition-colors"
            >
              {t.onboarding.getStarted}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
