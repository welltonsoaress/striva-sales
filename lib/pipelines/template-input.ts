import type { EtapaProposta } from "@/lib/onboarding/proposta-de-funil";

export type CriarFunilStageInput = Omit<EtapaProposta, "nome"> & { name: string };

export interface CriarFunilInput {
  name: string;
  template_id?: string;
  stages?: CriarFunilStageInput[];
  /** Chaves das etapas escolhidas para acontecimentos da agenda; null = manual. */
  event_stage_keys?: {
    appointment_pending: string | null;
    appointment_confirmed: string | null;
    human_handoff: string | null;
  };
}
