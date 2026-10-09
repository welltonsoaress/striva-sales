-- A policy restritiva existente conserva isolamento e modo de suporte.
-- O período comercial também vale para uploads diretos com JWT do cliente.
create or replace function public.fn_support_storage_write_allowed(p_name text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_org uuid; a public.organization_ai_accounts;
begin
  if split_part(p_name,'/',1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    -- Paths da plataforma continuam sujeitos às policies permissivas próprias.
    return true;
  end if;
  v_org:=split_part(p_name,'/',1)::uuid;
  if not public.fn_support_write_allowed(v_org) then return false; end if;
  select * into a from public.organization_ai_accounts where organization_id=v_org;
  if not found then return false; end if;
  return a.mode='legacy' or (a.mode='platform' and (
    a.state='pending' or (a.state in('trial','active') and a.access_until is not null and a.access_until>now())
  ));
end $$;
revoke execute on function public.fn_support_storage_write_allowed(text) from public,anon;
grant execute on function public.fn_support_storage_write_allowed(text) to authenticated,service_role;
notify pgrst,'reload schema';
