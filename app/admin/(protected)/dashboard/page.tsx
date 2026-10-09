import { DashboardClient } from "./_client";
import { SaasOverview } from '@/components/admin/SaasOverview';

export const metadata = { title: "Dashboard — Admin Plataforma" };

export default function AdminDashboardPage() {
  return <><SaasOverview/><DashboardClient /></>;
}
