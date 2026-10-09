import { expect, it } from "vitest";
import { deliveryMayBeUnknown } from "./delivery-uncertainty";

it("interrupções ambíguas preservam a intenção; rejeições explícitas liberam", () => {
  for (const error of [
    new Error("waha_timeout: sem recibo"),
    new DOMException("timeout", "TimeoutError"),
    new TypeError("fetch failed", { cause: { code: "ECONNRESET" } }),
    new Error("waha_502"),
  ])
    expect(deliveryMayBeUnknown(error)).toBe(true);
  for (const error of [
    new Error("waha_401"),
    new Error("storage_sign_failed"),
    new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }),
  ])
    expect(deliveryMayBeUnknown(error)).toBe(false);
});
