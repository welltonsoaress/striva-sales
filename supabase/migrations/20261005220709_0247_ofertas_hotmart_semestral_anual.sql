-- 0247: seis ofertas fornecidas pelo proprietário. Valores conferidos no checkout
-- público Hotmart em 05/10/2026. Limites iniciais definidos com sua autorização;
-- editáveis no painel. Checkout segue desligado até homologação da operação.
alter table public.commercial_plans drop constraint if exists commercial_plans_billing_interval_check;
alter table public.commercial_plans add constraint commercial_plans_billing_interval_check
  check (billing_interval in ('month', 'semester', 'year'));
alter table public.billing_checkouts add column if not exists billing_interval text
  check (billing_interval in ('month', 'semester', 'year'));
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('essencial','Básico','Organize o atendimento e acompanhe suas primeiras oportunidades.',118200,'semester',false,0,'{"users": 2, "whatsapp_numbers": 1, "ai_credits": 1000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "ywwwcw8z", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=ywwwcw8z&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('pro','Pro','Conecte atendimento, acompanhamento e gestão para sua equipe vender com mais organização.',178200,'semester',true,1,'{"users": 5, "whatsapp_numbers": 2, "ai_credits": 3000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "k8dnfot7", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=k8dnfot7&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('empresarial','Empresarial','Mais capacidade para equipes com maior volume de atendimento.',238200,'semester',false,2,'{"users": 10, "whatsapp_numbers": 3, "ai_credits": 6000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "vgjipy7o", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=vgjipy7o&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('essencial-anual','Básico','Organize o atendimento e acompanhe suas primeiras oportunidades.',164400,'year',false,3,'{"users": 2, "whatsapp_numbers": 1, "ai_credits": 1000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "n35rbszu", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=n35rbszu&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('pro-anual','Pro','Conecte atendimento, acompanhamento e gestão para sua equipe vender com mais organização.',284400,'year',true,4,'{"users": 5, "whatsapp_numbers": 2, "ai_credits": 3000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "xeibh38j", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=xeibh38j&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
insert into public.commercial_plans
  (slug,name,description,price_cents,billing_interval,recommended,position,limits,hotmart_offer,publication_state)
values ('empresarial-anual','Empresarial','Mais capacidade para equipes com maior volume de atendimento.',356400,'year',false,5,'{"users": 10, "whatsapp_numbers": 3, "ai_credits": 6000, "ai_credits_period": "month"}'::jsonb,'{"product_ucode": "1e932b14-f2e8-4139-bf8e-3374ea86ca2c", "offer_code": "32t83f4b", "checkout_url": "https://pay.hotmart.com/Q107903903G?off=32t83f4b&checkoutMode=6", "enabled": false}'::jsonb,'published')
on conflict (slug) do update set name=excluded.name, description=excluded.description,
  price_cents=excluded.price_cents, billing_interval=excluded.billing_interval,
  recommended=excluded.recommended, limits=excluded.limits, hotmart_offer=excluded.hotmart_offer,
  publication_state=excluded.publication_state, updated_at=now()
where commercial_plans.hotmart_offer is null and commercial_plans.publication_state='draft'
  and commercial_plans.billing_interval is null;
notify pgrst, 'reload schema';
