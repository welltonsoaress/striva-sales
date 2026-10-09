import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { MANUAL } from "@/lib/help/manual";
import { ManualClient } from "./_client";

export const metadata = { title: "Ajuda e manual" };

export default async function AjudaPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  const role = org?.role ?? "viewer";
  return (
    <ManualClient
      artigos={MANUAL.map((artigo) => ({
        ...artigo,
        passos: [...artigo.passos],
        podeAbrir: ROLE_RANK[role] >= ROLE_RANK[artigo.minRole],
      }))}
    />
  );
}
