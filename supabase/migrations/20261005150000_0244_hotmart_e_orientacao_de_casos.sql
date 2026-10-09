-- 0244: ofertas Hotmart desligadas até configuração + vínculo confiável da compra.
alter table public.commercial_plans add column if not exists hotmart_offer jsonb;
alter table public.management_actions drop constraint if exists management_actions_action_check;
alter table public.management_actions add constraint management_actions_action_check
  check (action in ('move_lead_stage', 'create_task', 'book_appointment', 'request_appointment',
    'assign_conversation', 'pause_attendance', 'resume_attendance', 'reply_case'));

create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  reference text not null unique check (reference ~ '^[a-f0-9]{24}$'),
  plan_id uuid not null references public.commercial_plans(id) on delete restrict,
  product_ucode uuid not null, offer_code text not null,
  price_cents bigint not null check (price_cents >= 0), currency text not null default 'BRL' check (currency = 'BRL'),
  transaction_code text unique,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create table if not exists public.billing_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  checkout_id uuid not null,
  external_key text not null unique,
  subscriber_code text unique,
  subscription_status text,
  next_charge_at timestamptz,
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, checkout_id) references public.billing_checkouts(organization_id, id) on delete restrict
);
create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null,
  transaction_code text not null unique,
  amount_cents bigint not null check (amount_cents >= 0), currency text not null,
  status text not null, last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, contract_id) references public.billing_contracts(organization_id, id) on delete restrict
);
-- Caixa GLOBAL de entrada: pode ainda não ter vínculo com organização. Somente
-- operador de plataforma por rota guardada; nada de payload bruto com dados pessoais.
create table if not exists public.billing_webhook_events (
  event_id text primary key, event text not null, occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  state text not null check (state in ('received', 'applied', 'unmatched', 'obsolete', 'unsupported')),
  reason text, normalized jsonb not null
);
alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from public, anon, authenticated;
grant all on public.billing_webhook_events to service_role;

do $$ declare t text; begin
  foreach t in array array['billing_checkouts', 'billing_contracts', 'billing_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop policy if exists %I on public.%I', 'tenant_isolation_' || t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using
      (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, ''admin''))',
      'tenant_isolation_' || t || '_select', t);
    execute format('create index if not exists %I on public.%I (organization_id, created_at desc)', t || '_org_idx', t);
  end loop;
end $$;
notify pgrst, 'reload schema';
