import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmail() {
  const { t } = useLanguage();
  const verifyMutation = trpc.auth.verifyEmail.useMutation();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }

    verifyMutation.mutateAsync({ token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{t.auth.verifyTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "pending" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.verifyPending}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.verifySuccess}</p>
              <Link href="/login">
                <Button className="w-full">{t.auth.verifyGoToLogin}</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{t.auth.verifyError}</p>
              <Link href="/login">
                <Button variant="outline" className="w-full">{t.auth.verifyGoToLogin}</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
