/*
 * Paddle.js Integration Hook
 * Initializes Paddle and provides checkout opening function
 */

import { useEffect, useRef } from "react";

// Paddle client-side token (production)
const PADDLE_CLIENT_TOKEN = "live_3ef8b32c3653a66953160274200";

// Price ID for $9/month subscription
export const PADDLE_PRICE_ID = "pri_01kmygcd8stckbs3d7vt3xenq6";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: { token: string; environment?: string }) => void;
      Checkout: {
        open: (config: {
          items: { priceId: string; quantity: number }[];
          settings?: {
            displayMode?: string;
            theme?: string;
            locale?: string;
            successUrl?: string;
          };
        }) => void;
      };
    };
  }
}

export function usePaddleInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
      });
      initialized.current = true;
    } else {
      // Wait for Paddle script to load
      const interval = setInterval(() => {
        if (window.Paddle) {
          window.Paddle.Initialize({
            token: PADDLE_CLIENT_TOKEN,
          });
          initialized.current = true;
          clearInterval(interval);
        }
      }, 200);
      // Clean up after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, []);
}

export function openPaddleCheckout(locale?: string) {
  if (!window.Paddle) {
    console.warn("Paddle.js not loaded yet");
    return;
  }

  // Map our language codes to Paddle locale codes
  const localeMap: Record<string, string> = {
    en: "en",
    fr: "fr",
    es: "es",
    ru: "en", // Paddle doesn't support Russian, fallback to English
    ka: "en", // Paddle doesn't support Georgian, fallback to English
  };

  window.Paddle.Checkout.open({
    items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: localeMap[locale || "en"] || "en",
    },
  });
}
