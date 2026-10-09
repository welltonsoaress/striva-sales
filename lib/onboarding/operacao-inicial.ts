import { createClient } from '@/lib/supabase/server';
/** Usa RLS da sessão: cada pessoa vê apenas a operação que pode acompanhar. */
export async function carregarOperacaoInicial(org:string) {
  const db=await createClient();
  const now=new Date(),end=new Date(now.getTime()+86400000);
  const [conversations,appointments,opportunities]=await Promise.all([
    db.from('conversations').select('id',{count:'exact',head:true}).eq('organization_id',org).eq('status','pending'),
    db.from('calendar_appointments').select('id',{count:'exact',head:true}).eq('organization_id',org).gte('starts_at',now.toISOString()).lt('starts_at',end.toISOString()).not('status','in','(cancelled,no_show)'),
    db.from('crm_leads').select('id',{count:'exact',head:true}).eq('organization_id',org).is('closed_at',null),
  ]);
  return {conversations:conversations.error?null:conversations.count,appointments:appointments.error?null:appointments.count,opportunities:opportunities.error?null:opportunities.count};
}
