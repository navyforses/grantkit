/*
 * Contact Page — Simple contact form with email sending
 * Design: Structured Clarity — clean centered form
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
import { toast } from "sonner";

export default function Contact() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sendMessage = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent successfully!");
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    sendMessage.mutate({
      title: `Contact Form: ${name} (${email})`,
      content: `From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <SEO
        title="Contact Us"
        description="Get in touch with the GrantKit team. Questions about grants, subscriptions, or partnerships? We usually respond within 24 hours."
        canonicalPath="/contact"
      />
      <Navbar />

      {/* Header */}
      <div className="bg-[#0f172a] py-10">
        <div className="container">
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-sm text-blue-200/70 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            Contact Us
          </h1>
          <p className="text-blue-200/70 max-w-xl">
            Have a question, suggestion, or need help? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-200 rounded-lg p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-[#0f172a] mb-2">Message Sent!</h2>
              <p className="text-gray-500 mb-6">
                Thank you for reaching out. We'll get back to you as soon as possible.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setName("");
                    setEmail("");
                    setMessage("");
                  }}
                >
                  Send Another Message
                </Button>
                <Link href="/catalog">
                  <Button className="bg-[#1e3a5f] hover:bg-[#0f172a]">
                    Browse Catalog
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
              <div className="grid md:grid-cols-5 gap-8">
                {/* Contact info */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Get in Touch</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <a href="mailto:hello@grantkit.co" className="text-sm text-[#1e3a5f] hover:underline">
                            hello@grantkit.co
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-[#1e3a5f] mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Response Time</p>
                          <p className="text-sm text-gray-500">Usually within 24 hours</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="md:col-span-3">
                  <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="How can we help you?"
                        rows={5}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#1e3a5f] hover:bg-[#0f172a] gap-2"
                      disabled={sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
