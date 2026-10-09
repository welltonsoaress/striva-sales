import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { UsersClient } from "./_client";

export const metadata = { title: "Usuários — Admin Plataforma" };

export default async function AdminUsersPage() {
  const { platformAdmin } = await requirePlatformAdmin();
  return <UsersClient canManage={platformAdmin.scope === "full"} />;
}
