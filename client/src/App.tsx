import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { usePaddleInit } from "./hooks/usePaddle";
import { useEffect } from "react";
import MobileHeader from "./components/MobileHeader";
import MobileBottomNav from "./components/MobileBottomNav";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import GrantDetail from "./pages/GrantDetail";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import AiAssistant from "./pages/AiAssistant";
import OnboardingModal from "./components/OnboardingModal";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/grant/:id" component={GrantDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/admin" component={Admin} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/ai-assistant" component={AiAssistant} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <PaddleInitializer />
            <HtmlLangSetter />
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
