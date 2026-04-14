import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { TRPCClientError } from "@trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Purpose, PurposeDetail, Need, NeedDetail } from "@shared/profileTypes";
import ProgressBar from "./ProgressBar";
import StepCountry from "./StepCountry";
import StepPurpose from "./StepPurpose";
import StepNeeds from "./StepNeeds";

interface OnboardingState {
  step: 1 | 2 | 3;
  country: string | null;
  purposes: Purpose[];
  purposeDetails: PurposeDetail[];
  needs: Need[];
  needDetails: NeedDetail[];
}

export const ONBOARDING_STATE_STORAGE_KEY = "grantkit_onboarding_state";

export default function OnboardingFlow() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    country: null,
    purposes: [],
    purposeDetails: [],
    needs: [],
    needDetails: [],
  });

  const saveProfile = trpc.onboarding.saveProfile.useMutation();

  const persistState = (value: OnboardingState) => {
    sessionStorage.setItem(ONBOARDING_STATE_STORAGE_KEY, JSON.stringify(value));
  };

  const submitState = async (payload: OnboardingState) => {
    if (!payload.country) return;

    try {
      await saveProfile.mutateAsync({
        targetCountry: payload.country,
        purposes: payload.purposes,
        purposeDetails: payload.purposeDetails,
        needs: payload.needs,
        needDetails: payload.needDetails,
      });
      sessionStorage.removeItem(ONBOARDING_STATE_STORAGE_KEY);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof TRPCClientError) {
        const message = String(err.message ?? "");
        if (message.includes("UNAUTHORIZED") || message.includes("Unauthorized")) {
          persistState(payload);
          window.location.href = getLoginUrl();
          return;
        }
      }
      setError(t.profile.saveProfileError);
      setError(t.profile.noNeedsResults);
    }
  };

  const handleFinish = async () => {
    await submitState(state);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem(ONBOARDING_STATE_STORAGE_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const restored: OnboardingState = JSON.parse(raw) as OnboardingState;
      setState(restored);
      if (isAuthenticated && restored.country) {
        void submitState(restored);
      }
    } catch {
      sessionStorage.removeItem(ONBOARDING_STATE_STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const content = useMemo(() => {
    switch (state.step) {
      case 1:
        return (
          <StepCountry
            selected={state.country}
            onSelect={(country) => setState((prev) => ({ ...prev, country }))}
            onNext={() => {
              setDirection(1);
              setState((prev) => ({ ...prev, step: 2 }));
            }}
          />
        );
      case 2:
        return (
          <StepPurpose
            purposes={state.purposes}
            purposeDetails={state.purposeDetails}
            onUpdate={(purposes, purposeDetails) => setState((prev) => ({ ...prev, purposes, purposeDetails }))}
            onBack={() => {
              setDirection(-1);
              setState((prev) => ({ ...prev, step: 1 }));
            }}
            onNext={() => {
              setDirection(1);
              setState((prev) => ({ ...prev, step: 3 }));
            }}
          />
        );
      default:
        return (
          <StepNeeds
            needs={state.needs}
            needDetails={state.needDetails}
            onUpdate={(needs, needDetails) => setState((prev) => ({ ...prev, needs, needDetails }))}
            onBack={() => {
              setDirection(-1);
              setState((prev) => ({ ...prev, step: 2 }));
            }}
            onFinish={handleFinish}
            saving={saveProfile.isPending}
          />
        );
    }
  }, [state, saveProfile.isPending]);

  return (
    <div className="min-h-screen bg-secondary px-4 py-6 md:flex md:items-center md:justify-center">
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="space-y-6">
          <ProgressBar currentStep={state.step} totalSteps={3} />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={state.step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.2 }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
