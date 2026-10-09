import { expect, it } from "vitest";
import { sameRequestOrigin } from "./request-origin";
it("mutações pessoais recusam origem ausente, malformada ou de outro domínio", () => {
  const request = (origin?: string) =>
    new Request("https://crm.local.test/api", { headers: origin ? { origin } : {} });
  expect(sameRequestOrigin(request(), "https://crm.local.test")).toBe(false);
  expect(sameRequestOrigin(request("null"), "https://crm.local.test")).toBe(false);
  expect(
    sameRequestOrigin(request("https://crm.local.test.evil.test"), "https://crm.local.test"),
  ).toBe(false);
  expect(sameRequestOrigin(request("https://crm.local.test"), "https://crm.local.test")).toBe(true);
});
