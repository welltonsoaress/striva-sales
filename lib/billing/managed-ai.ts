import type pg from "pg";
import type { Queryable } from "@/lib/agent-engine/queue/queue";
import type { LlmEdgeConfig, OrgLlmConfig } from "@/lib/agent-engine/edge/llm/credentials";
import { pricedUsage, type ModelPrice } from "@/lib/ai/model-price";

export class CommercialAiError extends Error {
  readonly terminal = true;
  override readonly name = "commercial_ai_blocked";
  constructor(public readonly code: string) {
    super(code);
  }
}

export interface ManagedSettings {
  provider: string;
  model: string;
  operator_model: string | null;
  max_output_tokens: number;
  max_steps: number;
  monthly_cost_limit_cents: number;
  purpose_models?: Record<string, { provider: string; model: string; enabled: boolean }>;
  transcription_price_per_minute_cents?: number | null;
  transcription_pricing_source?: string | null;
}
interface AccountRow {
  mode: string;
  state: string;
  access_until: Date | string | null;
}

export function assertCommercialAccess(account: AccountRow | null, purpose: string): void {
  if (!account || account.mode === "legacy") return;
  // O ensaio da configuração é permitido antes da primeira ativação.
  if (
    account.state === "pending" &&
    ["agent_test", "agent_preview", "checkpoint", "connection_test"].includes(purpose)
  )
    return;
  if (
    !["trial", "active"].includes(account.state) ||
    !account.access_until ||
    new Date(account.access_until).getTime() <= Date.now()
  ) {
    throw new CommercialAiError("ai_access_inactive");
  }
}

export function platformKey(provider: string, cfg: LlmEdgeConfig): string {
  const key =
    provider === "openai"
      ? cfg.openaiApiKey
      : provider === "anthropic"
        ? cfg.anthropicApiKey
        : provider === "openrouter"
          ? cfg.openrouterApiKey
          : undefined;
  if (!key) throw new CommercialAiError("ai_platform_credential_missing");
  return key;
}

export function platformConfig(settings: ManagedSettings, cfg: LlmEdgeConfig): OrgLlmConfig {
  return {
    provider: settings.provider,
    apiKey: platformKey(settings.provider, cfg),
    defaultModel: settings.model,
    enabledModels: [],
    params: { maxOutputTokens: settings.max_output_tokens },
    orcamento: { modo: "off", tetoCents: 0, efetivoEm: null, limiarPct: 80 },
    orcamentoIndisponivelPorque: null,
  };
}

/** Sem fallback após erro de leitura: o modo gerenciado não pode escapar dos limites. */
export async function managedSettingsPg(
  db: Pick<pg.Pool, "query">,
  org: string,
  purpose: string,
  job: string | null = null,
): Promise<ManagedSettings | null> {
  const { rows } = await db.query<AccountRow>(
    "select mode,state,access_until from organization_ai_accounts where organization_id=$1",
    [org],
  );
  const account = rows[0];
  if (!account) throw new CommercialAiError("ai_account_unavailable");
  if (account.mode === "legacy") return null;
  if (account.mode !== "platform") throw new CommercialAiError("ai_account_unavailable");
  try {
    await db.query("select fn_ai_check_access($1,$2,$3)", [org, purpose, job]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ai_account_unavailable";
    throw new CommercialAiError(/^ai_[a-z_]+$/.test(message) ? message : "ai_account_unavailable");
  }
  assertCommercialAccess(account, purpose);
  const { rows: settings } = await db.query<ManagedSettings & { enabled: boolean }>(
    "select * from platform_ai_settings where id=true",
  );
  const config = settings[0];
  if (!config?.enabled || !config.provider || !config.model)
    throw new CommercialAiError("ai_platform_unavailable");
  const selected = config.purpose_models?.[purpose];
  if (selected && !selected.enabled) throw new CommercialAiError("ai_purpose_unavailable");
  return selected
    ? {
        ...config,
        provider: selected.provider,
        model: selected.model,
        operator_model: purpose === "operator_turn" ? selected.model : config.operator_model,
      }
    : config;
}

export async function modelPricePg(
  db: Pick<pg.Pool, "query">,
  provider: string,
  model: string,
): Promise<ModelPrice | null> {
  const { rows } = await db.query<{
    input: string | null;
    output: string | null;
    cache_read: string | null;
    cache_write: string | null;
    verified_at?: string | null;
    source?: string | null;
  }>(
    `select input_price_per_million_cents as input,output_price_per_million_cents as output,
      cache_read_price_per_million_cents as cache_read,cache_write_price_per_million_cents as cache_write,pricing_verified_at::text as verified_at,pricing_source as source
      from ai_models where provider=$1 and model_id=$2 and deprecated_at is null`,
    [provider, model],
  );
  if (!rows[0]) return null;
  const rates = Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [
      key,
      ["source", "verified_at"].includes(key) ? value : value === null ? null : Number(value),
    ]),
  ) as unknown as ModelPrice;
  return rates;
}

export function assertPricedModel(price: ModelPrice | null): void {
  if (
    !price?.verified_at ||
    !price.source ||
    pricedUsage(price, {
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }) === null
  ) {
    throw new CommercialAiError("ai_model_price_missing");
  }
}

/** Reserva repetida usa a identidade do job, inclusive chamadas de ferramentas e replay. */
export async function reserveResponsePg(
  db: Queryable,
  org: string,
  job: string,
): Promise<string | null> {
  const { rows } = await db.query<{ id: string | null }>("select fn_ai_reserve($1,$2) id", [
    org,
    `job:${job}`,
  ]);
  return rows[0]?.id ?? null;
}
