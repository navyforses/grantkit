import { FormEvent, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "../const";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Login() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await loginMutation.mutateAsync({ email: email.trim(), password });
      await refresh();
      toast.success(t.auth.loginCta);
      navigate("/dashboard");
    } catch (err: any) {
      const code = err?.data?.code;
      if (code === "TOO_MANY_REQUESTS") setFormError(t.auth.errLocked);
      else if (code === "FORBIDDEN") setFormError(t.auth.errEmailUnverified);
      else setFormError(t.auth.errInvalidCredentials);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{t.auth.loginTitle}</CardTitle>
          <CardDescription>{t.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{t.auth.tabEmail}</TabsTrigger>
              <TabsTrigger value="oauth">{t.auth.tabOAuth}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {formError && (
                  <p className="text-sm text-destructive" role="alert">{formError}</p>
                )}
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t.auth.loginCta}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    {t.auth.loginForgot}
                  </Link>
                  <span className="text-muted-foreground">
                    {t.auth.loginNoAccount}{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      {t.auth.loginSignupLink}
                    </Link>
                  </span>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="oauth">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">{t.auth.oauthHint}</p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    try {
                      window.location.href = getLoginUrl();
                    } catch {
                      toast.error(t.auth.errGeneric);
                    }
                  }}
                >
                  {t.auth.oauthCta}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
