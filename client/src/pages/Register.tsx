import { FormEvent, useState } from "react";
import { Link, Redirect } from "wouter";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Register() {
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (isAuthenticated) return <Redirect to="/dashboard" />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 10) { setFormError(t.auth.errPasswordMin); return; }
    if (password !== confirm) { setFormError(t.auth.errPasswordMismatch); return; }

    try {
      await registerMutation.mutateAsync({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        language: language as "en" | "fr" | "es" | "ru" | "ka",
      });
      setSubmitted(true);
    } catch {
      setFormError(t.auth.errGeneric);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{t.auth.registerTitle}</CardTitle>
          <CardDescription>{t.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.registerSuccess}</p>
              <Link href="/login">
                <Button variant="outline" className="w-full">{t.auth.verifyGoToLogin}</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.nameLabel}</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                />
              </div>
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
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t.auth.registerCta}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t.auth.registerHaveAccount}{" "}
                <Link href="/login" className="text-primary hover:underline">
                  {t.auth.registerLoginLink}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
