import { describe, expect, it } from "vitest";
import { isStoragePathOwnedBy } from "./path-ownership";

describe("posse do objeto antes de usar service role", () => {
  it.each(["org/avatars/contact.jpg", "org/conversation/message.pdf", "org/document.md"])(
    "permite o objeto próprio %s",
    (path) => {
      expect(isStoragePathOwnedBy(path, "org")).toBe(true);
    },
  );
  it.each([
    "neighbor/avatars/contact.jpg",
    "org-neighbor/file.pdf",
    "org/../neighbor/file.pdf",
    "org/%2e%2e/neighbor/file.pdf",
    "org//file.jpg",
    "org/file.jpg?owner=neighbor",
    "org/file.jpg#fragment",
    "org/\\neighbor.jpg",
    "org/",
    "file.pdf",
  ])("nega o objeto fora do namespace canônico %s", (path) => {
    expect(isStoragePathOwnedBy(path, "org")).toBe(false);
  });
  it("falha fechada com dado de JSON inválido ou sem dono confiável", () => {
    expect(isStoragePathOwnedBy(12 as never, "org")).toBe(false);
    expect(isStoragePathOwnedBy("org/file.jpg", "")).toBe(false);
  });
});
