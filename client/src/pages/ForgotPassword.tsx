import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { Loader2, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForgotPassword() {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const forgotMutation = trpc.auth.forgotPassword.useMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await forgotMutation.mutateAsync({
        email: email.trim(),
        language: language as "en" | "fr" | "es" | "ru" | "ka",
      });
    } catch {
      // Always show the same success message to avoid account enumeration.
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{t.auth.forgotTitle}</CardTitle>
          <CardDescription>{t.auth.forgotSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <Mail className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.forgotSent}</p>
              <Link href="/login">
                <Button variant="outline" className="w-full">{t.auth.forgotBackToLogin}</Button>
              </Link>
            </div>
          ) : (
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
              <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                {forgotMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t.auth.forgotCta}
              </Button>
              <div className="text-sm text-center">
                <Link href="/login" className="text-primary hover:underline">
                  {t.auth.forgotBackToLogin}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
