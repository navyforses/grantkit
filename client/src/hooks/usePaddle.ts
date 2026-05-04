/*
 * Paddle.js Integration Hook
 * Initializes Paddle and provides checkout opening function
 * Now auth-aware: requires login before checkout
 */

import { useEffect, useRef } from "react";

// Paddle client-side token (production)
const PADDLE_CLIENT_TOKEN = "live_3ef8b32c3653a66953160274200";

// Price ID for $9/month subscription
export const PADDLE_PRICE_ID = "pri_01kmygcd8stckbs3d7vt3xenq6";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: { token: string; environment?: string; eventCallback?: (event: PaddleEvent) => void }) => void;
      Checkout: {
        open: (config: {
          items: { priceId: string; quantity: number }[];
          customer?: { email?: string };
          customData?: Record<string, string | number>;
          settings?: {
            displayMode?: string;
            theme?: string;
            locale?: string;
            successUrl?: string;
          };
        }) => void;
      };
    };
    __paddleEventCallback?: (event: PaddleEvent) => void;
  }
}

interface PaddleEvent {
  name: string;
}

export function usePaddleInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const initPaddle = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          eventCallback: (event: PaddleEvent) => {
            if (window.__paddleEventCallback) {
              window.__paddleEventCallback(event);
            }
          },
        });
        initialized.current = true;
      }
    };

    if (window.Paddle) {
      initPaddle();
    } else {
      const interval = setInterval(() => {
        if (window.Paddle) {
          initPaddle();
          clearInterval(interval);
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, []);
}

export function openPaddleCheckout(
  userId: number,
  locale?: string,
  email?: string,
  onCompleted?: () => void
) {
  if (!window.Paddle) {
    console.warn("Paddle.js not loaded yet");
    return;
  }

  // The webhook is the source of truth for activation. The client only needs
  // to know that the checkout completed so it can poll auth.me until the
  // server-side status flips to "active".
  if (onCompleted) {
    window.__paddleEventCallback = (event: PaddleEvent) => {
      if (event.name === "checkout.completed") {
        onCompleted();
      }
    };
  }

  // Map our language codes to Paddle locale codes
  const localeMap: Record<string, string> = {
    en: "en",
    fr: "fr",
    es: "es",
    ru: "en",
    ka: "en",
  };

  const checkoutConfig: Parameters<typeof window.Paddle.Checkout.open>[0] = {
    items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
    // Paddle echoes customData back in subscription.* webhook events as
    // event.data.custom_data — the webhook uses userId to link the
    // subscription to the right user without trusting any client-supplied
    // value on the activation path.
    customData: { userId },
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: localeMap[locale || "en"] || "en",
    },
  };

  if (email) {
    checkoutConfig.customer = { email };
  }

  window.Paddle.Checkout.open(checkoutConfig);
}
