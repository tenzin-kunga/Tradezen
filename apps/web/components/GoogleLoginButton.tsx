"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: () => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const initGIS = useCallback(() => {
    if (initialized.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("GoogleLoginButton: NEXT_PUBLIC_GOOGLE_CLIENT_ID not set");
      return;
    }
    initialized.current = true;

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          onSuccessRef.current(response.credential);
        } else {
          onErrorRef.current();
        }
      },
    });

    if (buttonRef.current) {
      window.google!.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: buttonRef.current.offsetWidth || 400,
      });
    }
  }, []);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGIS();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGIS;
    document.body.appendChild(script);

    return () => {
      initialized.current = false;
    };
  }, [initGIS]);

  return <div ref={buttonRef} className="w-full" style={{ minHeight: "48px" }} />;
}
