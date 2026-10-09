import { expect, it } from "vitest";
import { avatarPathOwnedBy, avatarPresetUrl } from "./avatars";
it("a limpeza da foto não alcança arquivo de outra pessoa ou caminho arbitrário", () => {
  const owner = "aaaaaaaa-0000-4000-8000-000000000001";
  const image = "bbbbbbbb-0000-4000-8000-000000000002.png";
  expect(avatarPathOwnedBy(`${owner}/${image}`, owner)).toBe(true);
  expect(avatarPathOwnedBy(`outro/${image}`, owner)).toBe(false);
  expect(avatarPathOwnedBy(`${owner}/../${image}`, owner)).toBe(false);
  expect(avatarPathOwnedBy(null, owner)).toBe(false);
  expect(avatarPresetUrl()).toBe("/avatars/violeta.svg");
});
