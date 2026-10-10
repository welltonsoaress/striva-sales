import { redirect } from "next/navigation";

import { inheritedAgentConnection } from "@/lib/ai/agents/inherited-connection";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { createClient } from "@/lib/supabase/server";

import { lerAmbiente } from "@/lib/instalacao/ambiente";

import { AgentForm } from "../[id]/_components/AgentForm";

export const dynamic = "force-dynamic";

/**
 * Os provedores cuja chave veio na INSTALAÇÃO (`.env`), não da tela de
 * Credenciais.
 *
 * Sai de `lerAmbiente`, a mesma leitura que o retrato da instalação usa — uma
 * segunda lista de nomes de variável divergiria no dia em que um provedor novo
 * entrasse.
 */
function provedoresDaInstalacao(): string[] {
  const a = lerAmbiente();
  return Object.entries(a.chavesDeProvedor)
    .filter(([, tem]) => tem)
    .map(([id]) => id);
}

export default async function NewAgentPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (ROLE_RANK[activeOrg.role] < ROLE_RANK.admin) {
    redirect("/403");
  }

  const supabase = await createClient();
  const channelSessions = await listSelectableChannels(supabase, activeOrg.orgId);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <AgentForm
        credentialEditingAllowed={false}
        inheritedConnection={await inheritedAgentConnection(activeOrg.orgId)}
        mode="create"
        credentials={[]}
        provedoresDaInstalacao={provedoresDaInstalacao()}
        channelSessions={channelSessions}
      />
    </div>
  );
}
