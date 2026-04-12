/*
 * MobileBottomNav — App-like bottom tab bar for mobile devices
 * Shows on screens < 768px. Provides quick access to Home, Browse, Dashboard, Profile.
 */

import { Link, useLocation } from "wouter";
import { Home, Search, LayoutDashboard, User, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLoginUrl } from "@/const";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === "admin";

  const tabs = [
    {
      href: "/",
      icon: Home,
      label: t.nav.home,
      active: location === "/",
    },
    {
      href: "/catalog",
      icon: Search,
      label: t.nav.catalog,
      active: location === "/catalog" || location.startsWith("/grant/"),
    },
    // AI Assistant tab — shown only for non-admin users (admins already have 5 tabs)
    ...(!isAdmin
      ? [
          {
            href: "/ai-assistant",
            icon: Sparkles,
            label: "AI",
            active: location === "/ai-assistant",
          },
        ]
      : []),
    {
      href: isAuthenticated ? "/dashboard" : getLoginUrl(),
      icon: LayoutDashboard,
      label: t.nav.dashboard,
      active: location === "/dashboard",
      isExternal: !isAuthenticated,
    },
    {
      href: isAuthenticated ? "/profile" : getLoginUrl(),
      icon: User,
      label: t.nav.profile,
      active: location === "/profile",
      isExternal: !isAuthenticated,
    },
  ];

  // Add admin tab for admin users
  if (isAdmin) {
    tabs.push({
      href: "/admin",
      icon: Shield,
      label: t.nav.admin,
      active: location === "/admin",
    });
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom theme-transition">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          if (tab.isExternal) {
            return (
              <a
                key={tab.label}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  tab.active
                    ? "text-brand-green"
                    : "text-muted-foreground active:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={tab.active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </a>
            );
          }
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                tab.active
                  ? "text-brand-green"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={tab.active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
