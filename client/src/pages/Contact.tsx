/*
 * Contact Page — Simple contact form with email sending
 * Mobile: full-width form, stacked layout, touch-friendly inputs
 * Desktop: 5-col grid with contact info sidebar
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useApiHealth } from "@/hooks/useApiHealth";
import { toast } from "sonner";

export default function Contact() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { isStaticMode } = useApiHealth();

  const sendMessage = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success(t.contact.toastSuccess);
    },
    onError: () => {
      // Fallback to mailto when API is unavailable (static deployment)
      const mailtoUrl = `mailto:hello@grantkit.co?subject=${encodeURIComponent(`Contact Form: ${name}`)}&body=${encodeURIComponent(`From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      window.location.href = mailtoUrl;
      toast.info((t.contact as any).toastFallback || "Opening your email client...");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t.contact.toastValidation);
      return;
    }
    sendMessage.mutate({
      title: `Contact Form: ${name} (${email})`,
      content: `From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO
        title={t.seo.contactTitle}
        description={t.seo.contactDescription}
        canonicalPath="/contact"
      />
      <Navbar />

      {/* Header — compact on mobile */}
      <div className="bg-secondary py-6 md:py-10 border-b border-border">
        <div className="container px-4 md:px-0">
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground active:text-foreground md:hover:text-foreground transition-colors mb-3 md:mb-4">
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {t.contact.backHome}
            </button>
          </Link>
          <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight mb-1 md:mb-2">
            {t.contact.heading}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            {t.contact.subheading}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 md:px-0 py-6 md:py-12 flex-1 pb-24 md:pb-12">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-xl md:rounded-lg p-6 md:p-8 text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Send className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">{t.contact.successTitle}</h2>
              <p className="text-sm text-muted-foreground mb-5 md:mb-6">
                {t.contact.successMessage}
              </p>
              <div className="flex flex-col md:flex-row gap-2 md:gap-3 justify-center">
                <Button
                  variant="outline"
                  className="h-11 md:h-10 rounded-xl md:rounded-md"
                  onClick={() => {
                    setSubmitted(false);
                    setName("");
                    setEmail("");
                    setMessage("");
                  }}
                >
                  {t.contact.sendAnother}
                </Button>
                <Link href="/catalog">
                  <Button className="bg-primary hover:bg-primary h-11 md:h-10 rounded-xl md:rounded-md w-full md:w-auto">
                    {t.contact.browseCatalog}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Mobile: contact info strip */}
              <div className="md:hidden flex gap-3 mb-4">
                <div className="flex-1 bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/60">{t.contact.emailLabel}</p>
                    <a href="mailto:hello@grantkit.co" className="text-xs font-medium text-primary">
                      hello@grantkit.co
                    </a>
                  </div>
                </div>
                <div className="flex-1 bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/60">{t.contact.responseLabel}</p>
                    <p className="text-xs font-medium text-foreground/80">{t.contact.responseTime}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-5 gap-6 md:gap-8">
                {/* Desktop: Contact info sidebar */}
                <div className="hidden md:block md:col-span-2 space-y-6">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t.contact.getInTouch}</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.contact.emailLabel}</p>
                          <a href="mailto:hello@grantkit.co" className="text-sm text-primary hover:underline">
                            hello@grantkit.co
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.contact.responseTimeLabel}</p>
                          <p className="text-sm text-muted-foreground">{t.contact.usualResponseTime}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="md:col-span-3">
                  <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl md:rounded-lg p-4 md:p-6 space-y-4 md:space-y-5">
                    <div>
                      <label className="text-xs md:text-sm font-medium text-foreground/80 mb-1.5 block">{t.contact.nameLabel}</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t.contact.namePlaceholder}
                          className="pl-10 h-11 md:h-10 text-base md:text-sm rounded-xl md:rounded-md"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs md:text-sm font-medium text-foreground/80 mb-1.5 block">{t.contact.emailLabel}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.contact.emailPlaceholder}
                          className="pl-10 h-11 md:h-10 text-base md:text-sm rounded-xl md:rounded-md"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs md:text-sm font-medium text-foreground/80 mb-1.5 block">{t.contact.messageLabel}</label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t.contact.messagePlaceholder}
                        rows={4}
                        className="text-base md:text-sm rounded-xl md:rounded-md"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary gap-2 h-12 md:h-10 text-sm rounded-xl md:rounded-md"
                      disabled={sendMessage.isPending || isStaticMode}
                    >
                      {sendMessage.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t.contact.sending}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t.contact.sendMessage}
                        </>
                      )}
                    </Button>
                    {isStaticMode && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        {(t as any).staticMode?.contactDisabled || "Contact form is temporarily unavailable."}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
