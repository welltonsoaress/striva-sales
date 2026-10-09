import { expect, it } from "vitest";
import {
  hotmartCheckoutUrl,
  hotmartPaymentLink,
  parseHotmartPurchase,
  parseHotmartCancellation,
  validHotmartToken,
} from "./hotmart";

const product = "22222222-2222-4222-8222-222222222222";
export function purchaseFixture() {
  return {
    id: "event-qa",
    version: "2.0.0",
    creation_date: Date.now(),
    event: "PURCHASE_APPROVED",
    data: {
      product: { ucode: product },
      buyer: { email: "never-store@qa.local", document: "12345678901" },
      purchase: {
        transaction: "HP-QA",
        status: "APPROVED",
        price: { value: 297, currency_value: "BRL" },
        offer: { code: "pro-qa" },
        origin: { sck: "a".repeat(24) },
        date_next_charge: Date.now() + 30 * 86400000,
      },
      subscription: { status: "ACTIVE", subscriber: { code: "sub-qa" } },
    },
  };
}
it("só autentica com segredo configurado e cabeçalho exato", () => {
  expect(validHotmartToken("abc", "abc")).toBe(true);
  expect(validHotmartToken("abc ", "abc")).toBe(false);
  expect(validHotmartToken(null, "abc")).toBe(false);
  expect(validHotmartToken("", "")).toBe(false);
});
it("recusa links externos, credenciais na URL e HTTP", () => {
  for (const url of [
    "http://pay.hotmart.com/x",
    "https://pay.hotmart.com.evil.test/x",
    "https://user:pass@pay.hotmart.com/x",
  ])
    expect(hotmartCheckoutUrl.safeParse(url).success).toBe(false);
  const url = new URL(
    hotmartPaymentLink(
      {
        product_ucode: product,
        offer_code: "pro-qa",
        checkout_url: "https://pay.hotmart.com/x?off=other&sck=old",
        enabled: true,
      },
      "a".repeat(24),
    ),
  );
  expect(url.searchParams.get("sck")).toBe("a".repeat(24));
  expect(url.searchParams.get("off")).toBe("pro-qa");
});
it("normaliza centavos e datas, descartando os dados pessoais do payload", () => {
  const parsed = parseHotmartPurchase(purchaseFixture());
  expect(parsed).toMatchObject({ amount_cents: 29700, currency: "BRL", subscriber_code: "sub-qa" });
  expect(JSON.stringify(parsed)).not.toMatch(/never-store|12345678901|buyer|document/);
  const invalid = purchaseFixture();
  invalid.data.purchase.price.value = 297.001;
  expect(() => parseHotmartPurchase(invalid)).toThrow("invalid_money_precision");
});
it("cancelamento é outro contrato e não vira compra", () => {
  const input = purchaseFixture();
  input.event = "SUBSCRIPTION_CANCELLATION";
  expect(parseHotmartPurchase(input)).toBeNull();
});

it("cancelamento oficial usa data.subscriber e descarta valor, nome e e-mail", () => {
  const parsed = parseHotmartCancellation({
    id: "cancel-qa",
    event: "SUBSCRIPTION_CANCELLATION",
    version: "2.0.0",
    creation_date: Date.parse("2026-10-05T12:00:00Z"),
    data: {
      subscriber: { code: "sub-qa", name: "Synthetic person", email: "private@qa.test" },
      cancellation_date: Date.parse("2026-10-05T11:59:00Z"),
      date_next_charge: Date.parse("2026-11-05T12:00:00Z"),
      product: { id: 123, name: "QA" },
      actual_recurrence_value: 297,
    },
  });
  expect(parsed).toEqual({
    event_id: "cancel-qa",
    event: "SUBSCRIPTION_CANCELLATION",
    occurred_at: "2026-10-05T12:00:00.000Z",
    subscriber_code: "sub-qa",
    cancelled_at: "2026-10-05T11:59:00.000Z",
    access_until: "2026-11-05T12:00:00.000Z",
  });
  expect(JSON.stringify(parsed)).not.toMatch(/private|Synthetic|297|product/);
  expect(parseHotmartCancellation(purchaseFixture())).toBeNull();
  expect(() =>
    parseHotmartCancellation({ ...purchaseFixture(), event: "SUBSCRIPTION_CANCELLATION" }),
  ).toThrow();
});
