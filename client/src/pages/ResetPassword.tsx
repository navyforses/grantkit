import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ResetPassword() {
  const { t } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!token) { setFormError(t.auth.resetInvalidToken); return; }
    if (password.length < 10) { setFormError(t.auth.errPasswordMin); return; }
    if (password !== confirm) { setFormError(t.auth.errPasswordMismatch); return; }

    try {
      await resetMutation.mutateAsync({ token, password });
      setSuccess(true);
    } catch {
      setFormError(t.auth.resetInvalidToken);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{t.auth.resetTitle}</CardTitle>
          <CardDescription>{t.auth.resetSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.resetSuccess}</p>
              <Link href="/login">
                <Button className="w-full">{t.auth.verifyGoToLogin}</Button>
              </Link>
            </div>
          ) : !token ? (
            <div className="space-y-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.resetInvalidToken}</p>
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full">{t.auth.forgotCta}</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t.auth.confirmPasswordLabel}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive" role="alert">{formError}</p>
              )}
              <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t.auth.resetCta}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
