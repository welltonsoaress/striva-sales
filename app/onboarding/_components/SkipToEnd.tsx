"use client";

import { useState, useTransition } from "react";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
import { dismissOnboarding } from "@/app/actions/onboarding/dismissOnboarding";

export function SkipToEnd() {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await dismissOnboarding();
            if (result) setError(result.error);
          });
        }}
      >
        {pending ? t("Salvando…") : t("Configurar depois")}
      </Button>
      {error && (
        <p role="alert" className="max-w-56 text-xs text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}
