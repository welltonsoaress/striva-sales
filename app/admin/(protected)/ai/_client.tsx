"use client";
import { useT, useIdioma } from "@/lib/i18n/IdiomaProvider";
import { tagDeIdioma } from "@/lib/i18n/datas";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hotmartOfferSchema } from "@/lib/billing/hotmart";
import {
  saveManagedAi,
  saveModelTariff,
  saveCreditPack,
  publishCreditPack,
  testManagedAi,
} from "@/app/actions/admin/managedAi";
type Settings = {
  enabled: boolean;
  apply_to_all?: boolean;
  provider: string | null;
  model: string | null;
  operator_model: string | null;
  max_output_tokens: number;
  max_steps: number;
  monthly_cost_limit_cents: number;
  requests_per_minute: number;
  purpose_models: unknown;
  transcription_price_per_minute_cents: number | null;
  transcription_pricing_source: string | null;
};
type Model = {
  provider: string;
  model_id: string;
  display_name: string;
  input_price_per_million_cents: number | null;
  output_price_per_million_cents: number | null;
  pricing_verified_at: string | null;
};
const field = "mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm";
export function ManagedAiEditor({
  initial,
  credentials,
  models,
  packs,
  readOnly,
}: {
  initial: Settings;
  credentials: { provider: string; last4: string }[];
  models: Model[];
  packs: {
    id: string;
    name: string;
    units: number;
    price_cents: number | null;
    publication_state: string;
    hotmart_offer: unknown;
  }[];
  readOnly: boolean;
}) {
  const t = useT();
  const locale = tagDeIdioma(useIdioma());

  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState(initial.provider ?? "openai");
  const [tariffModel, setTariffModel] = useState("");
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const editingPack = packs.find((p) => p.id === editingPackId) ?? null;
  const parsedOffer = hotmartOfferSchema.safeParse(editingPack?.hotmart_offer);
  const editingOffer = parsedOffer.success ? parsedOffer.data : null;
  const act = (task: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setMessage("");
      try {
        const r = await task();
        setMessage(r.ok ? "Alteração registrada." : (r.error ?? "Falha ao aplicar."));
        if (r.ok) router.refresh();
      } catch {
        setMessage("Não foi possível concluir. Confira seu acesso e tente novamente.");
      }
    });
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <h1 className="mt-2 text-3xl font-semibold">{t("IA da plataforma")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            "Selecione o modelo e informe a chave que a plataforma usará no atendimento. Os clientes recebem essa configuração automaticamente.",
          )}
        </p>
      </header>
      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        action={(f) =>
          act(async () => {
            return saveManagedAi({
              enabled: f.get("enabled") === "on",
              apply_to_all: f.get("apply_to_all") === "on",
              api_key: String(f.get("api_key") ?? "").trim() || undefined,
              provider,
              model: String(f.get("model")),
              operator_model: null,
              max_output_tokens: Number(f.get("max_output_tokens")),
              max_steps: Number(f.get("max_steps")),
              monthly_cost_limit_cents: Number(f.get("monthly_cost_limit_cents")),
              requests_per_minute: Number(f.get("requests_per_minute")),
              purpose_models: {},
              transcription_price_per_minute_cents: f.get("transcription_rate")
                ? Number(f.get("transcription_rate"))
                : null,
              transcription_pricing_source:
                String(f.get("transcription_source") ?? "").trim() || null,
              reason: "Atualização da conexão de IA pelo administrador da plataforma.",
            });
          })
        }
      >
        <h2 className="text-xl font-semibold">{t("Conexão de atendimento")}</h2>
        <fieldset disabled={readOnly || pending} className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={initial.enabled} />
            {t("Habilitar atendimento com IA da plataforma")}
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t(
              "Essa opção liga a conexão gerenciada usada pelas contas com IA incluída, inclusive nas novas ativações. Ela não concede um plano nem créditos. Desligar pausa as chamadas gerenciadas.",
            )}
          </p>
          <label className="block text-sm">
            {t("Provedor")}
            <select
              className={field}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="openai">{"OpenAI"}</option>
              <option value="anthropic">{"Anthropic"}</option>
              <option value="openrouter">{"OpenRouter"}</option>
            </select>
          </label>
          <label className="text-sm">
            {t("Modelo de atendimento")}
            <select name="model" className={field} defaultValue={initial.model ?? ""} required>
              <option value="">{t("Selecione um modelo")}</option>
              {models
                .filter((m) => m.provider === provider)
                .map((m) => (
                  <option key={m.model_id} value={m.model_id}>
                    {m.display_name} ·{" "}
                    {m.pricing_verified_at ? t("tarifa validada") : t("validar tarifa")}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {t("Chave de API")}
            <input
              name="api_key"
              type="password"
              autoComplete="new-password"
              className={field}
              placeholder={
                credentials.find((c) => c.provider === provider)
                  ? `${t("Chave cadastrada · final")} ${credentials.find((c) => c.provider === provider)?.last4}`
                  : t("Cole a chave do provedor; vazio mantém a atual")
              }
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {t("A chave fica cifrada no servidor e nunca é exibida aos clientes.")}
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input
              name="apply_to_all"
              type="checkbox"
              defaultChecked={initial.apply_to_all ?? false}
            />
            {t("Aplicar o mesmo modelo a todas as empresas, inclusive contas legadas")}
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t(
              "A alteração vale para as próximas chamadas de todos os agentes. Planos, saldos e períodos contratados permanecem os da conta. Atendimento, organizador e classificações usam o modelo selecionado; documentos e áudio mantêm seus modelos próprios.",
            )}
          </p>
          <details className="sm:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">
              {t("Limites avançados e processamento de áudio")}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["max_output_tokens", t("Tokens de saída por chamada"), initial.max_output_tokens],
                ["max_steps", t("Etapas por chamada"), initial.max_steps],
                [
                  "requests_per_minute",
                  t("Chamadas por minuto por empresa"),
                  initial.requests_per_minute,
                ],
                [
                  "monthly_cost_limit_cents",
                  t("Teto operacional mensal (centavos de USD; 0 sem teto)"),
                  initial.monthly_cost_limit_cents,
                ],
                [
                  "transcription_rate",
                  t("Transcrição (centavos de USD por minuto)"),
                  initial.transcription_price_per_minute_cents ?? "",
                ],
              ].map(([name, label, value]) => (
                <label key={String(name)} className="text-sm">
                  {label}
                  <input
                    className={field}
                    type="number"
                    name={String(name)}
                    defaultValue={value}
                    min={0}
                    step="any"
                  />
                </label>
              ))}
              <label className="text-sm">
                {t("Fonte da tarifa de transcrição")}
                <input
                  name="transcription_source"
                  type="url"
                  defaultValue={initial.transcription_pricing_source ?? ""}
                  className={field}
                />
              </label>
            </div>
          </details>
          <Button type="submit" className="justify-self-start">
            {t("Salvar configuração")}
          </Button>
        </fieldset>
      </form>
      <details className="rounded-xl border bg-card p-6">
        <summary className="cursor-pointer font-semibold">
          {t("Tarifas e pacotes de créditos")}
        </summary>
        <div className="mt-6 space-y-6">
          <form
            className="space-y-4 rounded-xl border p-6"
            action={(f) =>
              act(() =>
                saveModelTariff({
                  provider: models.find((m) => `${m.provider}:${m.model_id}` === tariffModel)
                    ?.provider,
                  model: models.find((m) => `${m.provider}:${m.model_id}` === tariffModel)
                    ?.model_id,
                  input: Number(f.get("input")),
                  output: Number(f.get("output")),
                  cache_read: f.get("cache_read") ? Number(f.get("cache_read")) : null,
                  cache_write: f.get("cache_write") ? Number(f.get("cache_write")) : null,
                  source: String(f.get("source")),
                  reason: String(f.get("reason")),
                }),
              )
            }
          >
            <h2 className="text-xl font-semibold">{t("Validar tarifa do modelo")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Valores em centavos de USD por milhão de tokens, conforme fonte oficial. Campos de cache vazios permanecem desconhecidos.",
              )}
            </p>
            <fieldset disabled={readOnly || pending} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                {t("Modelo")}
                <select
                  className={field}
                  value={tariffModel}
                  onChange={(e) => setTariffModel(e.target.value)}
                  required
                >
                  <option value="">{t("Selecione")}</option>
                  {models.map((m) => (
                    <option
                      key={`${m.provider}:${m.model_id}`}
                      value={`${m.provider}:${m.model_id}`}
                    >
                      {m.provider} · {m.model_id}
                    </option>
                  ))}
                </select>
              </label>
              {[
                ["input", t("Entrada")],
                ["output", t("Saída")],
                ["cache_read", t("Leitura de cache")],
                ["cache_write", t("Gravação de cache")],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  {label}
                  <input
                    className={field}
                    type="number"
                    step="any"
                    min={0}
                    required={key === "input" || key === "output"}
                    name={key}
                  />
                </label>
              ))}
              <label className="text-sm">
                {t("Fonte oficial")}
                <input name="source" type="url" required className={field} />
              </label>
              <label className="text-sm">
                {t("Motivo")}
                <input name="reason" required minLength={10} className={field} />
              </label>
              <Button type="submit" className="justify-self-start">
                {t("Registrar tarifa")}
              </Button>
            </fieldset>
          </form>
          <form
            className="flex flex-wrap items-end gap-3 rounded-xl border p-5"
            action={(f) => act(() => testManagedAi(String(f.get("organization_id"))))}
          >
            <label className="flex-1 text-sm">
              {t("Empresa de teste (identificador)")}
              <input className={field} name="organization_id" required disabled={readOnly} />
            </label>
            <Button disabled={readOnly || pending} variant="outline">
              {t("Testar conexão")}
            </Button>
          </form>
          <section className="space-y-4 rounded-xl border p-6">
            <h2 className="text-xl font-semibold">{t("Pacotes de créditos extras")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "A venda permanece desativada até definir quantidade, preço e oferta Hotmart. Créditos extras são utilizáveis com assinatura ativa.",
              )}
            </p>
            <ul className="space-y-2 text-sm">
              {packs.map((p) => (
                <li key={p.id}>
                  {p.name} · {p.units} {t("créditos ·")}{" "}
                  {p.price_cents === null
                    ? t("Preço pendente")
                    : new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
                        p.price_cents / 100,
                      )}{" "}
                  · {p.publication_state}
                  {!readOnly && (
                    <button
                      type="button"
                      className="ml-3 text-primary underline"
                      onClick={() => setEditingPackId(p.id)}
                    >
                      {t("Editar pacote")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <form
              key={editingPack?.id ?? "new-pack"}
              className="grid gap-3 sm:grid-cols-2"
              action={(f) =>
                act(() =>
                  saveCreditPack({
                    id: editingPack?.id,
                    name: String(f.get("name")),
                    units: Number(f.get("units")),
                    price_cents: f.get("price_cents") ? Number(f.get("price_cents")) : null,
                    hotmart_offer:
                      f.get("checkout_url") || f.get("product_ucode") || f.get("offer_code")
                        ? {
                            checkout_url: String(f.get("checkout_url")),
                            product_ucode: String(f.get("product_ucode")),
                            offer_code: String(f.get("offer_code")),
                            enabled: false,
                          }
                        : null,
                    reason: String(f.get("reason")),
                  }),
                )
              }
            >
              <fieldset disabled={pending || readOnly} className="contents">
                <label className="text-sm">
                  {t("Nome")}
                  <input name="name" className={field} required defaultValue={editingPack?.name} />
                </label>
                <label className="text-sm">
                  {t("Quantidade de créditos")}
                  <input
                    name="units"
                    className={field}
                    type="number"
                    min={1}
                    required
                    defaultValue={editingPack?.units}
                  />
                </label>
                <label className="text-sm">
                  {t("Preço em centavos de BRL (opcional)")}
                  <input
                    name="price_cents"
                    className={field}
                    type="number"
                    min={1}
                    defaultValue={editingPack?.price_cents ?? ""}
                  />
                </label>
                <label className="text-sm">
                  {t("Motivo")}
                  <input name="reason" className={field} required minLength={10} />
                </label>
                <Button className="justify-self-start">{t("Salvar rascunho")}</Button>
                {editingPack && (
                  <Button type="button" variant="outline" onClick={() => setEditingPackId(null)}>
                    {t("Novo pacote")}
                  </Button>
                )}
                <label className="text-sm">
                  {t("Código do produto na Hotmart (ucode)")}
                  <input
                    name="product_ucode"
                    className={field}
                    defaultValue={editingOffer?.product_ucode ?? ""}
                  />
                </label>
                <label className="text-sm">
                  {t("Código da oferta na Hotmart")}
                  <input
                    name="offer_code"
                    className={field}
                    defaultValue={editingOffer?.offer_code ?? ""}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  {t("Link de pagamento da Hotmart")}
                  <input
                    name="checkout_url"
                    type="url"
                    className={field}
                    defaultValue={editingOffer?.checkout_url ?? ""}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(
                      "Salvar mantém o pacote em rascunho. A venda depende de homologação e publicação comercial.",
                    )}
                  </span>
                </label>
              </fieldset>
            </form>
            {editingPack?.publication_state === "draft" && (
              <form
                className="space-y-3 rounded-lg bg-muted/40 p-4"
                action={(f) =>
                  act(() =>
                    publishCreditPack({ id: editingPack.id, reason: String(f.get("reason")) }),
                  )
                }
              >
                <p className="text-sm">
                  {t(
                    "Publicar confirma que você conferiu o preço, o link e o recebimento dos eventos da oferta. A compra também depende da liberação do pagamento na plataforma.",
                  )}
                </p>
                <label className="block text-sm">
                  {t("Motivo da publicação")}
                  <input
                    className={field}
                    name="reason"
                    required
                    minLength={10}
                    disabled={pending || readOnly}
                  />
                </label>
                <Button disabled={pending || readOnly || !editingPack.hotmart_offer}>
                  {t("Publicar pacote homologado")}
                </Button>
              </form>
            )}
          </section>
        </div>
      </details>
      {message && (
        <p role="status" className="rounded-lg border bg-muted p-4 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
