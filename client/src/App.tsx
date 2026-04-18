import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { usePaddleInit } from "./hooks/usePaddle";
import { lazy, Suspense, useEffect } from "react";
import MobileHeader from "./components/MobileHeader";
import MobileBottomNav from "./components/MobileBottomNav";
import Home from "./pages/Home";
import OnboardingModal from "./components/OnboardingModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { ONBOARDING_STATE_STORAGE_KEY } from "@/components/onboarding/OnboardingFlow";

// Heavy pages — lazy-loaded so Google Maps JS API, @googlemaps/markerclusterer,
// and country-state-city (8.5 MB) are NOT included in the initial JS bundle.
// They only download when the user navigates to the relevant route.
const Catalog        = lazy(() => import("./pages/Catalog"));
const GrantDetail    = lazy(() => import("./pages/GrantDetail"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const Profile     = lazy(() => import("./pages/Profile"));
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Onboarding  = lazy(() => import("./pages/Onboarding"));
const Contact     = lazy(() => import("./pages/Contact"));
const Privacy     = lazy(() => import("./pages/Privacy"));
const Terms       = lazy(() => import("./pages/Terms"));
const Refund      = lazy(() => import("./pages/Refund"));
const Admin       = lazy(() => import("./pages/Admin"));
const Analytics   = lazy(() => import("./pages/Analytics"));
const AiAssistant = lazy(() => import("./pages/AiAssistant"));
const Register        = lazy(() => import("./pages/Register"));
const VerifyEmail     = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword  = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword"));
// Phase 3 verification page — only mounted in dev builds (see Router below).
const DevMapTest      = lazy(() => import("./pages/DevMapTest"));

// Blank screen (matches app background) shown while a lazy chunk downloads.
// Avoids white flash on theme-aware pages.
function PageFallback() {
  return <div className="min-h-screen bg-background" />;
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        {/* Home and Login stay eager — they are the most common entry points */}
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        {/* Everything else is lazy */}
        <Route path="/catalog" component={Catalog} />
        <Route path="/grant/:id" component={GrantDetail} />
        <Route path="/resources/:slug" component={ResourceDetail} />
        <Route path="/profile" component={Profile} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/refund" component={Refund} />
        <Route path="/admin" component={Admin} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/ai-assistant" component={AiAssistant} />
        {import.meta.env.DEV && <Route path="/dev/map-test" component={DevMapTest} />}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function PaddleInitializer() {
  usePaddleInit();
  return null;
}

function HtmlLangSetter() {
  const { language } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return null;
}

function OnboardingResumeGuard() {
  const { isAuthenticated, loading } = useAuth();
  const [path, navigate] = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (path === "/onboarding") return;
    const hasSavedState = Boolean(sessionStorage.getItem(ONBOARDING_STATE_STORAGE_KEY));
    if (hasSavedState) navigate("/onboarding");
  }, [isAuthenticated, loading, navigate, path]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <PaddleInitializer />
            <HtmlLangSetter />
            <OnboardingResumeGuard />
            <OnboardingModal />
            {/* Mobile-only header (hidden on md+) */}
            <MobileHeader />
            {/* Main content with bottom padding on mobile for bottom nav */}
            <div className="pb-16 md:pb-0">
              <Router />
            </div>
            {/* Mobile-only bottom tab bar (hidden on md+) */}
            <MobileBottomNav />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
