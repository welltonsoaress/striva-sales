/**
 * O registro pode ser da empresa e ainda carregar um ponteiro adulterado.
 * Antes de usar service role no Storage, confira o namespace do objeto.
 * Recebe o dono do contexto autenticado/job, nunca deduz o dono pelo caminho.
 */
export function isStoragePathOwnedBy(path: string, ownerId: string): boolean {
  if (
    typeof path !== "string" ||
    typeof ownerId !== "string" ||
    !ownerId ||
    !path.startsWith(`${ownerId}/`) ||
    /[\\%?#\u0000-\u001f\u007f]/.test(path)
  )
    return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
