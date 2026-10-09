"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/IdiomaProvider";

type Api = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
export function Turnstile({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string) => void;
}) {
  const t = useT();
  const node = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  const loaded = useCallback(() => setReady(true), []);
  useEffect(() => {
    const api = (window as unknown as { turnstile?: Api }).turnstile;
    if (!ready || !api || !node.current || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    const widget = api.render(node.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action,
      theme: "auto",
      callback: (token: string) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => api.remove(widget);
  }, [ready, action]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={loaded}
      />
      <div ref={node} aria-label={t("Verificação de segurança")} className="min-h-16" />
    </>
  );
}
