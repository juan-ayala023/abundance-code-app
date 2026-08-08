-- RLS y privilegios (CLAUDE.md §6).
--
-- Dos capas independientes, y hacen falta las dos:
--   * GRANT decide si el rol puede tocar la tabla.
--   * RLS decide qué filas ve.
-- El proyecto se creó con "Automatically expose new tables" desactivado, así
-- que ninguna tabla nueva tiene privilegios por defecto: hay que concederlos
-- de forma explícita aquí. Lo que no se conceda, queda cerrado.

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: el usuario ve y edita el suyo.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin política de INSERT: los perfiles los crea el trigger on_auth_user_created.
-- Sin política de DELETE: borrar el perfil es borrar la cuenta.

-- ---------------------------------------------------------------------------
-- entitlements: SOLO LECTURA para el usuario. Nunca escritura.
-- ---------------------------------------------------------------------------
alter table public.entitlements enable row level security;

-- Nótese que no se concede insert/update/delete a ningún rol público.
-- El webhook escribe con service_role, que salta RLS y no necesita GRANT.
grant select on public.entitlements to authenticated;

-- Dos formas de reconocer al dueño:
--   1. Ya está vinculado (user_id).
--   2. Todavía no, pero el email de la sesión coincide con el de la compra.
-- La segunda es la que permite que alguien que acaba de pagar entre sin haber
-- pasado nunca por la app.
create policy entitlements_select_own on public.entitlements
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or email = (((select auth.jwt()) ->> 'email'))::extensions.citext
  );

-- ---------------------------------------------------------------------------
-- portals
-- ---------------------------------------------------------------------------
alter table public.portals enable row level security;

grant select, insert, update on public.portals to authenticated;

create policy portals_select_own on public.portals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy portals_insert_own on public.portals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy portals_update_own on public.portals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin DELETE: el borrado de datos de nacimiento es una decisión de retención
-- todavía sin cerrar. Cuando se decida, se implementa de forma explícita.

-- ---------------------------------------------------------------------------
-- daily_activations
-- ---------------------------------------------------------------------------
alter table public.daily_activations enable row level security;

-- El usuario lee sus activaciones y puede marcarlas como leídas.
-- El contenido lo genera el servidor: no se concede insert.
grant select, update on public.daily_activations to authenticated;

create policy daily_activations_select_own on public.daily_activations
  for select to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = daily_activations.portal_id
        and p.user_id = (select auth.uid())
    )
  );

create policy daily_activations_update_own on public.daily_activations
  for update to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = daily_activations.portal_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.portals p
      where p.id = daily_activations.portal_id
        and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- guidance_queries
-- ---------------------------------------------------------------------------
alter table public.guidance_queries enable row level security;

-- Solo lectura para el usuario. Las filas las escribe el servidor tras llamar
-- a la IA: si el cliente pudiera insertarlas, podría falsear `tokens` y `model`
-- y romper tanto el costeo como el rate limit de CLAUDE.md §8.
grant select on public.guidance_queries to authenticated;

create policy guidance_queries_select_own on public.guidance_queries
  for select to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = guidance_queries.portal_id
        and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- stripe_events: sin acceso público de ningún tipo.
-- RLS activo y sin políticas = deniega todo salvo service_role.
-- ---------------------------------------------------------------------------
alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------
-- Vinculación de la compra con la cuenta.
--
-- El usuario no puede escribir en entitlements, así que la vinculación
-- email -> user_id se hace con esta función SECURITY DEFINER, que solo puede
-- reclamar la fila cuyo email coincide con el de SU sesión.
-- ---------------------------------------------------------------------------
create or replace function public.claim_entitlement()
returns public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email extensions.citext := (auth.jwt() ->> 'email')::extensions.citext;
  claimed public.entitlements;
begin
  if caller_id is null or caller_email is null then
    raise exception 'sin sesión autenticada' using errcode = '28000';
  end if;

  -- La condición sobre user_id impide arrebatar un entitlement ya vinculado
  -- a otra cuenta, incluso si compartieran email por un cambio posterior.
  update public.entitlements e
     set user_id = caller_id,
         updated_at = pg_catalog.now()
   where e.email = caller_email
     and (e.user_id is null or e.user_id = caller_id)
  returning e.* into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_entitlement() from public;
grant execute on function public.claim_entitlement() to authenticated;

comment on function public.claim_entitlement() is
  'Vincula el entitlement del email de la sesión con auth.uid(). Devuelve null si no hay ninguno.';
