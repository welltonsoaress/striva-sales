import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { SupportQueue } from "./_client";
export const metadata = { title: "Suporte" };
export default async function SupportPage() {
  const { user, platformAdmin } = await requirePlatformAdmin();
  return <SupportQueue userId={user.id} readOnly={platformAdmin.scope !== "full"} />;
}
