"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { AVATAR_PRESETS, MAX_AVATAR_BYTES } from "@/lib/profile/avatars";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";

export function AvatarPicker({
  value,
  onChange,
  upload = false,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  upload?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <fieldset disabled={disabled || pending} className="space-y-4">
      <legend className="mb-3 text-sm font-medium">{t("Sua imagem de perfil")}</legend>
      <div className="flex flex-wrap items-center gap-4">
        <Image
          unoptimized
          src={value || AVATAR_PRESETS[0].url}
          alt={t("Prévia da imagem de perfil")}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="flex gap-2">
          {AVATAR_PRESETS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              aria-label={`${t("Avatar")} ${t(avatar.label)}`}
              aria-pressed={value === avatar.url}
              className={
                "rounded-full p-1 focus-visible:outline-2 focus-visible:outline-ring " +
                (value === avatar.url ? "ring-2 ring-primary" : "hover:bg-muted")
              }
              onClick={() => onChange(avatar.url)}
            >
              <Image src={avatar.url} alt="" width={40} height={40} />
            </button>
          ))}
        </div>
      </div>
      {upload && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            {pending ? t("Enviando…") : t("Enviar foto")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(AVATAR_PRESETS[0].url)}
          >
            {t("Usar avatar padrão")}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg"
            aria-label={t("Escolher foto do computador")}
            className="sr-only"
            tabIndex={-1}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setError(null);
              if (file.size > MAX_AVATAR_BYTES) {
                setError(t("Use uma imagem PNG ou JPG de até 512 KB."));
                return;
              }
              setPending(true);
              try {
                const body = new FormData();
                body.set("file", file);
                const response = await fetch("/api/v1/profile/avatar", { method: "POST", body });
                const result = await response.json();
                if (!response.ok) {
                  setError(result.error?.message ?? t("Não foi possível enviar a foto."));
                  return;
                }
                onChange(result.data.avatar_url);
              } catch {
                setError(
                  t("Não foi possível enviar a foto. Confira sua conexão e tente novamente."),
                );
              } finally {
                setPending(false);
              }
            }}
          />
          <span className="text-xs text-muted-foreground">{t("PNG ou JPG, até 512 KB")}</span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
