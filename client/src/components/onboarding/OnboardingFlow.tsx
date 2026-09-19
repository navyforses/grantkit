/*
 * OnboardingFlow — Onboarding v2 (Phase 1.3). One flow component shared by
 * the /onboarding page and the first-login prompt (OnboardingPrompt).
 *
 * Steps: 1 country → 2 city + language → 3 status (optional, client-only,
 * D6) → 4 needs (11 integration domains). `purpose` is no longer asked.
 *
 * What reaches the server: `targetCountry` + `needs` (domain keys) only —
 * see buildProfilePayload. Status and city stay in localStorage.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { TRPCClientError } from "@trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { isDomain, needToDomain, type Domain } from "@shared/domains";
import { writeViewerCity, writeViewerStatus, type ViewerStatus } from "@/lib/onboardingLocal";
import ProgressBar from "./ProgressBar";
import StepCountry from "./StepCountry";
import StepCityLanguage from "./StepCityLanguage";
import StepStatus from "./StepStatus";
import StepNeeds from "./StepNeeds";

export interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  country: string | null;
  city: string;
  language: Language;
  status: ViewerStatus | null;
  needs: Domain[];
}

export const ONBOARDING_STATE_STORAGE_KEY = "grantkit_onboarding_state";

/** The only fields the server receives. Status/city are deliberately absent (D6). */
export function buildProfilePayload(state: Pick<OnboardingState, "country" | "needs">): { targetCountry: string; needs: Domain[] } {
  return { targetCountry: state.country ?? "", needs: state.needs };
}

/** Accept legacy `Need` values (VISA, HOUSING …) as well as domain keys. */
export function normalizeNeeds(raw: unknown): Domain[] {
  if (!Array.isArray(raw)) return [];
  const out: Domain[] = [];
  for (const value of raw) {
    const domain = isDomain(value) ? value : needToDomain(typeof value === "string" ? value : null);
    if (domain && !out.includes(domain)) out.push(domain);
  }
  return out;
}

interface OnboardingFlowProps {
  /** Rendered inside a dialog — no full-page wrapper. */
  embedded?: boolean;
  onDone?: () => void;
}

export default function OnboardingFlow({ embedded = false, onDone }: OnboardingFlowProps) {
  const { t, language: uiLanguage, setLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    country: null,
    city: "",
    language: uiLanguage,
    status: null,
    needs: [],
  });

  const saveProfile = trpc.onboarding.saveProfile.useMutation();

  const go = (step: OnboardingState["step"], dir: 1 | -1) => {
    setDirection(dir);
    setState((prev) => ({ ...prev, step }));
  };

  const submitState = async (payload: OnboardingState) => {
    if (!payload.country) return;
    writeViewerStatus(payload.status);
    writeViewerCity(payload.city);

    try {
      await saveProfile.mutateAsync(buildProfilePayload(payload));
      sessionStorage.removeItem(ONBOARDING_STATE_STORAGE_KEY);
      onDone?.();
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof TRPCClientError) {
        const message = String(err.message ?? "");
        if (message.includes("UNAUTHORIZED") || message.includes("Unauthorized")) {
          sessionStorage.setItem(ONBOARDING_STATE_STORAGE_KEY, JSON.stringify(payload));
          window.location.href = getLoginUrl();
          return;
        }
      }
      setError(t.profile.saveProfileError);
    }
  };

  useEffect(() => {
    const raw = sessionStorage.getItem(ONBOARDING_STATE_STORAGE_KEY);
    if (!raw) return;

    try {
      const restored = JSON.parse(raw) as Partial<OnboardingState>;
      const next: OnboardingState = {
        step: 4,
        country: restored.country ?? null,
        city: restored.city ?? "",
        language: restored.language ?? uiLanguage,
        status: restored.status ?? null,
        needs: normalizeNeeds(restored.needs),
      };
      setState(next);
      if (isAuthenticated && next.country) {
        void submitState(next);
      }
    } catch {
      sessionStorage.removeItem(ONBOARDING_STATE_STORAGE_KEY);
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
            onNext={() => go(2, 1)}
          />
        );
      case 2:
        return (
          <StepCityLanguage
            city={state.city}
            language={state.language}
            onCityChange={(city) => setState((prev) => ({ ...prev, city }))}
            onLanguageChange={(language) => {
              setLanguage(language);
              setState((prev) => ({ ...prev, language }));
            }}
            onBack={() => go(1, -1)}
            onNext={() => go(3, 1)}
          />
        );
      case 3:
        return (
          <StepStatus
            status={state.status}
            onSelect={(status) => setState((prev) => ({ ...prev, status }))}
            onBack={() => go(2, -1)}
            onNext={() => go(4, 1)}
          />
        );
      default:
        return (
          <StepNeeds
            needs={state.needs}
            onUpdate={(needs) => setState((prev) => ({ ...prev, needs }))}
            onBack={() => go(3, -1)}
            onFinish={() => submitState(state)}
            saving={saveProfile.isPending}
          />
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, saveProfile.isPending]);

  const body = (
    <div className="space-y-6">
      <ProgressBar currentStep={state.step} totalSteps={4} />

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
    </div>
  );

  if (embedded) return body;

  return (
    <div className="min-h-screen bg-secondary px-4 py-6 md:flex md:items-center md:justify-center">
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
