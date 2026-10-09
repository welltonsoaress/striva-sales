-- Catálogo comercial em rascunho. R$ 297 é referência aprovada para o Pro;
-- periodicidade, limites e cobrança precisam de decisão antes da publicação.
create table if not exists public.commercial_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_cents integer check (price_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  billing_interval text check (billing_interval in ('month', 'year')),
  recommended boolean not null default false,
  limits jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  publication_state text not null default 'draft' check (publication_state in ('draft', 'published')),
  updated_at timestamptz not null default now()
);
alter table public.commercial_plans enable row level security;
drop policy if exists commercial_plans_read on public.commercial_plans;
create policy commercial_plans_read on public.commercial_plans for select to authenticated using (true);
revoke all on public.commercial_plans from anon, authenticated;
grant select on public.commercial_plans to authenticated;
grant all on public.commercial_plans to service_role;
insert into public.commercial_plans (slug, name, description, price_cents, recommended, position)
values
  ('essencial', 'Essencial', 'Uma oferta para começar a organizar seu atendimento.', null, false, 0),
  ('pro', 'Pro', 'A oferta recomendada para conectar atendimento, agente e gestão comercial.', 29700, true, 1),
  ('empresarial', 'Empresarial', 'Uma oferta para operações que precisam de uma composição personalizada.', null, false, 2)
on conflict (slug) do nothing;

-- O suporte da plataforma é separado das conversas comerciais de cada tenant.
-- Escritas só passam pelas rotas autenticadas; usuários leem seus chamados.
create table if not exists public.platform_support_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'waiting_human', 'human_active', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index if not exists platform_support_queue on public.platform_support_threads(status, updated_at);
create index if not exists platform_support_owner on public.platform_support_threads(organization_id, created_by);
alter table public.platform_support_threads enable row level security;
drop policy if exists tenant_isolation_platform_support_threads_all on public.platform_support_threads;
create policy tenant_isolation_platform_support_threads_all on public.platform_support_threads
  using (organization_id in (select * from public.fn_user_org_ids()) and created_by = auth.uid())
  with check (organization_id in (select * from public.fn_user_org_ids()) and created_by = auth.uid());
revoke all on public.platform_support_threads from anon, authenticated;
grant select on public.platform_support_threads to authenticated;
grant all on public.platform_support_threads to service_role;

-- A fila observa mudanças em realtime sem expor o conteúdo das mensagens.
-- Repete a exigência de MFA do guard da plataforma também no banco.
drop policy if exists platform_support_queue_read on public.platform_support_threads;
create policy platform_support_queue_read on public.platform_support_threads for select to authenticated
  using (status in ('waiting_human', 'human_active') and exists (
    select 1 from public.platform_admins p where p.user_id = auth.uid()
      and p.revoked_at is null and (not p.mfa_required or auth.jwt()->>'aal' = 'aal2')
  ));

create table if not exists public.platform_support_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null,
  client_message_id uuid not null,
  author_kind text not null check (author_kind in ('user', 'assistant', 'human', 'system')),
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  source text check (source in ('model', 'manual')),
  created_at timestamptz not null default now(),
  foreign key (organization_id, thread_id) references public.platform_support_threads(organization_id, id) on delete cascade,
  unique (thread_id, client_message_id)
);
create index if not exists platform_support_history on public.platform_support_messages(organization_id, thread_id, created_at);
alter table public.platform_support_messages enable row level security;
drop policy if exists tenant_isolation_platform_support_messages_all on public.platform_support_messages;
create policy tenant_isolation_platform_support_messages_all on public.platform_support_messages
  using (organization_id in (select * from public.fn_user_org_ids()) and exists (
    select 1 from public.platform_support_threads t where t.id = thread_id and t.organization_id = platform_support_messages.organization_id and t.created_by = auth.uid()
  ));
revoke all on public.platform_support_messages from anon, authenticated;
grant select on public.platform_support_messages to authenticated;
grant all on public.platform_support_messages to service_role;

-- Fotos pessoais privadas: a API valida dono/vínculo antes de entregar os bytes.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 524288, array['image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'platform_support_threads') then
      alter publication supabase_realtime add table public.platform_support_threads;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'platform_support_messages') then
      alter publication supabase_realtime add table public.platform_support_messages;
    end if;
  end if;
end $$;
