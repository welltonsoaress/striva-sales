export const AVATAR_PRESETS = [
  { id: "violeta", label: "Violeta", url: "/avatars/violeta.svg" },
  { id: "azul", label: "Azul", url: "/avatars/azul.svg" },
  { id: "verde", label: "Verde", url: "/avatars/verde.svg" },
  { id: "ambar", label: "Âmbar", url: "/avatars/ambar.svg" },
] as const;
export type AvatarId = (typeof AVATAR_PRESETS)[number]["id"];
export const AVATAR_IDS = AVATAR_PRESETS.map((avatar) => avatar.id) as [AvatarId, ...AvatarId[]];
export const AVATAR_URLS = AVATAR_PRESETS.map((avatar) => avatar.url) as [string, ...string[]];
export function avatarPresetUrl(id: AvatarId = "violeta") {
  return AVATAR_PRESETS.find((avatar) => avatar.id === id)!.url;
}
export const AVATAR_BUCKET = "profile-avatars";
export const MAX_AVATAR_BYTES = 512 * 1024;
export function avatarPathOwnedBy(path: unknown, userId: string): path is string {
  return typeof path === "string" && new RegExp(`^${userId}/[a-f0-9-]{36}\\.(png|jpg)$`).test(path);
}
