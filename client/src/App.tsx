import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { usePaddleInit } from "./hooks/usePaddle";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Admin from "./pages/Admin";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/profile" component={Profile} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PaddleInitializer() {
  usePaddleInit();
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
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
