import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "../const";
import { useLanguage } from "@/contexts/LanguageContext";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      try {
        window.location.href = getLoginUrl();
      } catch {
        // OAuth not configured — stay on page
      }
    }
  }, [loading, isAuthenticated]);

  if (!loading && isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">
          {(t as any).login?.redirecting || "Redirecting to login..."}
        </p>
      </div>
    </div>
  );
}
