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
  data?: {
    customer_id?: string;
    subscription_id?: string;
    transaction_id?: string;
    id?: string;
    status?: string;
  };
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
  locale?: string,
  email?: string,
  onSuccess?: (data: { customerId?: string; subscriptionId?: string; transactionId?: string }) => void
) {
  if (!window.Paddle) {
    console.warn("Paddle.js not loaded yet");
    return;
  }

  // Set up event callback for this checkout session
  if (onSuccess) {
    window.__paddleEventCallback = (event: PaddleEvent) => {
      if (event.name === "checkout.completed" || event.name === "checkout.closed") {
        if (event.name === "checkout.completed" && event.data) {
          onSuccess({
            customerId: event.data.customer_id,
            subscriptionId: event.data.subscription_id || event.data.id,
            transactionId: event.data.transaction_id || event.data.id,
          });
        }
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
