-- claim_entitlement(): devolver un conjunto, no una fila.
--
-- Declarada como `returns public.entitlements`, cuando no hay coincidencia
-- PostgREST no devuelve null: devuelve un objeto con TODOS los campos a null.
-- Obligaría al cliente a distinguir "no hay compra" de "hay compra vacía"
-- inspeccionando campos, que es justo el tipo de ambigüedad que produce
-- usuarios que pagaron y no pueden entrar.
--
-- Con `setof`, la respuesta es una lista: vacía = no hay compra que reclamar.

drop function if exists public.claim_entitlement();

create function public.claim_entitlement()
returns setof public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email extensions.citext := (auth.jwt() ->> 'email')::extensions.citext;
begin
  if caller_id is null or caller_email is null then
    raise exception 'sin sesión autenticada' using errcode = '28000';
  end if;

  -- La condición sobre user_id impide arrebatar un entitlement ya vinculado
  -- a otra cuenta.
  return query
    update public.entitlements e
       set user_id = caller_id,
           updated_at = pg_catalog.now()
     where e.email = caller_email
       and (e.user_id is null or e.user_id = caller_id)
    returning e.*;
end;
$$;

revoke all on function public.claim_entitlement() from public;
grant execute on function public.claim_entitlement() to authenticated;

comment on function public.claim_entitlement() is
  'Vincula el entitlement del email de la sesión con auth.uid(). Lista vacía si no hay ninguno.';
