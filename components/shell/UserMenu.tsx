"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useUser, useAuth } from "@/hooks/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SeletorDeIdioma } from "@/components/shell/SeletorDeIdioma";
import { useT } from "@/hooks/i18n/useT";
import { SignOut, UserCircle, Receipt, ListChecks } from "@/lib/ui/icons";

function initials(name: string | null, email: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const t = useT();
  const user = useUser();
  const { signOut, activeOrg } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const simplified = activeOrg?.interface_settings?.preset === "simplificada";

  return (
    <div className="flex items-center gap-2">
      <SeletorDeIdioma />
      <ThemeToggle />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t("Menu do usuário")}
          >
            <Avatar className="h-8 w-8">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
              <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="w-64 max-w-[calc(100vw-24px)]"
        >
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium">{user.full_name ?? user.email}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app/settings/profile">
              <UserCircle aria-hidden />
              {t("Meu perfil")}
            </Link>
          </DropdownMenuItem>
          {activeOrg?.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/app/settings/billing">
                <Receipt aria-hidden />
                {t("Meu plano")}
              </Link>
            </DropdownMenuItem>
          )}
          {activeOrg && !user.support && (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() =>
                startTransition(async () => {
                  try {
                    await apiClient.patch("/api/v1/profile/interface", {
                      preset: simplified ? "completa" : "simplificada",
                    });
                    router.refresh();
                  } catch (error) {
                    showApiError(error);
                  }
                })
              }
            >
              <ListChecks aria-hidden />
              {t(simplified ? "Modo completo" : "Modo simplificado")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await signOut();
              })
            }
          >
            <SignOut size={16} className="mr-2" aria-hidden />
            {t("Sair")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
