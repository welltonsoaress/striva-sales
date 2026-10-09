"use client";
import { AlertsBell } from "./AlertsBell";
import { MobileSidebar } from "./MobileSidebar";
import { TenantSwitcher } from "./TenantSwitcher";
import { UserMenu } from "./UserMenu";
import { SearchTrigger } from "./SearchTrigger";
import Link from "next/link";
import { BookOpen } from "@/lib/ui/icons";
import { useT } from "@/hooks/i18n/useT";

export function TopBar({
  pendingCasesCount = 0,
  pendingCasesUnknown = false,
}: {
  pendingCasesCount?: number;
  pendingCasesUnknown?: boolean;
}) {
  const t = useT();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebar
          pendingCasesCount={pendingCasesCount}
          pendingCasesUnknown={pendingCasesUnknown}
        />
        <TenantSwitcher />
      </div>
      <div className="flex min-w-0 flex-1 justify-center md:max-w-md">
        <SearchTrigger />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/app/ajuda" aria-label={t("Ajuda e manual")} title={t("Ajuda e manual")} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><BookOpen size={20} /></Link>
        <AlertsBell />
        <UserMenu />
      </div>
    </header>
  );
}
