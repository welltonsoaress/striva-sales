import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Hottok é um segredo de cabeçalho, conforme Webhook Hotmart 2.0.0. */
export function validHotmartToken(received: string | null, configured: string): boolean {
  if (!configured || !received) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(configured));
}

export const hotmartCheckoutUrl = z
  .string()
  .trim()
  .max(1000)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "pay.hotmart.com" &&
      !url.username &&
      !url.password &&
      !url.port
    );
  }, "Use o link direto de pagamento da Hotmart.");

export const hotmartOfferSchema = z.object({
  product_ucode: z.string().trim().uuid(),
  offer_code: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/),
  checkout_url: hotmartCheckoutUrl,
  enabled: z.boolean(),
});
export type HotmartOffer = z.infer<typeof hotmartOfferSchema>;

/** A referência é correlação pública, não credencial. Cabe no SCK de 30 caracteres. */
export function hotmartPaymentLink(offer: HotmartOffer, reference: string): string {
  if (!/^[a-f0-9]{24}$/.test(reference)) throw new Error("invalid_checkout_reference");
  const url = new URL(hotmartCheckoutUrl.parse(offer.checkout_url));
  url.searchParams.set("off", offer.offer_code);
  url.searchParams.set("sck", reference);
  return url.toString();
}

export const hotmartEnvelopeSchema = z.object({
  id: z.string().min(1).max(100),
  version: z.literal("2.0.0"),
  creation_date: z.number().int().positive().max(8_640_000_000_000_000),
  event: z.string().min(1).max(100),
  data: z.unknown(),
});
const money = z.object({
  value: z.number().finite().nonnegative().max(1_000_000),
  currency_value: z.string().length(3),
});
const purchaseData = z.object({
  product: z.object({ ucode: z.string().uuid() }),
  purchase: z.object({
    transaction: z.string().min(1).max(100),
    status: z.string().min(1).max(60),
    price: money,
    offer: z.object({ code: z.string().min(1).max(100) }),
    origin: z.object({ sck: z.string().max(255).optional() }).optional(),
    date_next_charge: z.number().int().positive().max(8_640_000_000_000_000).nullish(),
  }),
  subscription: z
    .object({
      status: z.string().min(1).max(60),
      subscriber: z.object({ code: z.string().min(1).max(100) }),
    })
    .optional(),
});
export const PURCHASE_EVENTS = [
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_CANCELED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_BILLET_PRINTED",
  "PURCHASE_PROTEST",
  "PURCHASE_EXPIRED",
  "PURCHASE_DELAYED",
] as const;

export type HotmartPurchase = {
  event_id: string;
  event: string;
  occurred_at: string;
  product_ucode: string;
  offer_code: string;
  transaction: string;
  status: string;
  amount_cents: number;
  currency: string;
  reference: string | null;
  subscriber_code: string | null;
  subscription_status: string | null;
  next_charge_at: string | null;
};

export type HotmartCancellation = {
  event_id: string;
  event: "SUBSCRIPTION_CANCELLATION";
  occurred_at: string;
  subscriber_code: string;
  cancelled_at: string;
  access_until: string | null;
};

/** Contrato oficial 2.0.0: subscriber fica em data, não em subscription.
 * Não mantém comprador nem transforma o último valor pago em outro pagamento. */
export function parseHotmartCancellation(raw: unknown): HotmartCancellation | null {
  const envelope = hotmartEnvelopeSchema.parse(raw);
  if (envelope.event !== "SUBSCRIPTION_CANCELLATION") return null;
  const date = z.number().int().positive().max(8_640_000_000_000_000);
  const data = z
    .object({
      subscriber: z.object({ code: z.string().min(1).max(100) }),
      cancellation_date: date,
      date_next_charge: date.nullish(),
    })
    .parse(envelope.data);
  if (data.cancellation_date > envelope.creation_date + 5 * 60_000)
    throw new Error("invalid_cancellation_date");
  return {
    event_id: envelope.id,
    event: "SUBSCRIPTION_CANCELLATION",
    occurred_at: new Date(envelope.creation_date).toISOString(),
    subscriber_code: data.subscriber.code,
    cancelled_at: new Date(data.cancellation_date).toISOString(),
    access_until: data.date_next_charge ? new Date(data.date_next_charge).toISOString() : null,
  };
}
/** Descarta comprador, documento, endereço e qualquer campo desconhecido antes de persistir. */
export function parseHotmartPurchase(raw: unknown): HotmartPurchase | null {
  const envelope = hotmartEnvelopeSchema.parse(raw);
  if (!(PURCHASE_EVENTS as readonly string[]).includes(envelope.event)) return null;
  const data = purchaseData.parse(envelope.data);
  const cents = data.purchase.price.value * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) throw new Error("invalid_money_precision");
  return {
    event_id: envelope.id,
    event: envelope.event,
    occurred_at: new Date(envelope.creation_date).toISOString(),
    product_ucode: data.product.ucode,
    offer_code: data.purchase.offer.code,
    transaction: data.purchase.transaction,
    status: data.purchase.status,
    amount_cents: Math.round(cents),
    currency: data.purchase.price.currency_value,
    reference: data.purchase.origin?.sck ?? null,
    subscriber_code: data.subscription?.subscriber.code ?? null,
    subscription_status: data.subscription?.status ?? null,
    next_charge_at: data.purchase.date_next_charge
      ? new Date(data.purchase.date_next_charge).toISOString()
      : null,
  };
}

export function billingStatusLabel(status: string): string {
  return (
    (
      {
        APPROVED: "Pagamento aprovado",
        COMPLETE: "Compra concluída",
        PRINTED_BILLET: "Aguardando pagamento",
        STARTED: "Aguardando pagamento",
        WAITING_PAYMENT: "Aguardando pagamento",
        DELAYED: "Pagamento em atraso",
        OVERDUE: "Pagamento em atraso",
        CANCELLED: "Pagamento cancelado",
        REFUNDED: "Pagamento reembolsado",
        CHARGEBACK: "Pagamento contestado",
        EXPIRED: "Pagamento expirado",
        PROTESTED: "Pagamento em análise",
        ACTIVE: "Assinatura ativa",
        INACTIVE: "Assinatura inativa",
        CANCELLED_BY_CUSTOMER: "Assinatura cancelada",
        CANCELLED_BY_SELLER: "Assinatura cancelada",
        CANCELLED_BY_ADMIN: "Assinatura cancelada",
      } as Record<string, string>
    )[status] ?? "Estado recebido da Hotmart"
  );
}
