import { TenantOverviewClient } from "./_client";
import { CompanyAiAccount } from '@/components/admin/CompanyAiAccount';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;
  return <><TenantOverviewClient id={id} /><CompanyAiAccount orgId={id}/></>;
}
