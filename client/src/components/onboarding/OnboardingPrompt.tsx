/*
 * OnboardingPrompt — first-login dialog that hosts the shared OnboardingFlow
 * (Phase 1.3). Replaces the old 3-bullet welcome modal: the prompt and the
 * /onboarding page render the same steps.
 *
 * Dismissing marks onboarding complete (as before) so the user is not nagged;
 * the Dashboard banner still offers to finish the profile later.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import OnboardingFlow from "./OnboardingFlow";

const DONE_KEY = "grantkit_onboarding_done";

export default function OnboardingPrompt() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [path] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const completeMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => localStorage.setItem(DONE_KEY, "true"),
  });

  useEffect(() => {
    if (!isAuthenticated || !user || path === "/onboarding") return;
    if (localStorage.getItem(DONE_KEY) === "true") return;
    if (user.onboardingCompleted) {
      localStorage.setItem(DONE_KEY, "true");
      return;
    }
    const timer = setTimeout(() => setIsOpen(true), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, path]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) completeMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.onboardingV2.welcomeTitle}</DialogTitle>
          <DialogDescription>{t.onboardingV2.welcomeSubtitle}</DialogDescription>
        </DialogHeader>
        <OnboardingFlow
          embedded
          onDone={() => {
            localStorage.setItem(DONE_KEY, "true");
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
