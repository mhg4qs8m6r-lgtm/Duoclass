import { useEffect, useRef, useCallback } from "react";

// Clés de test Cloudflare Turnstile
// En production, remplacez par vos propres clés depuis https://dash.cloudflare.com/
// Clé de test "Always passes": 1x00000000000000000000AA
// Clé de test "Always blocks": 2x00000000000000000000AB
// Clé de test "Forces interactive challenge": 3x00000000000000000000FF
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
  size?: "normal" | "compact";
  appearance?: "always" | "execute" | "interaction-only";
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  language?: string;
  className?: string;
}

export default function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  language,
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    
    // Nettoyer le widget existant
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignorer les erreurs de suppression
      }
    }

    // Rendre le nouveau widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: onVerify,
      "error-callback": onError,
      "expired-callback": onExpire,
      theme,
      language: language || "auto",
      size,
    });
  }, [onVerify, onError, onExpire, theme, language, size]);

  useEffect(() => {
    // Charger le script Turnstile s'il n'est pas déjà chargé
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;
      
      window.onTurnstileLoad = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };
      
      document.head.appendChild(script);
    } else if (window.turnstile) {
      // Le script est déjà chargé
      scriptLoadedRef.current = true;
      renderWidget();
    }

    return () => {
      // Nettoyer le widget lors du démontage
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignorer les erreurs
        }
      }
    };
  }, [renderWidget]);

  // Re-rendre si les props changent
  useEffect(() => {
    if (scriptLoadedRef.current && window.turnstile) {
      renderWidget();
    }
  }, [theme, language, size, renderWidget]);

  return (
    <div 
      ref={containerRef} 
      className={`turnstile-container ${className}`}
      data-testid="turnstile-widget"
    />
  );
}

// Hook pour vérifier le token Turnstile côté serveur
export function useTurnstileVerification() {
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("Turnstile verification error:", error);
      return false;
    }
  };

  return { verifyToken };
}
