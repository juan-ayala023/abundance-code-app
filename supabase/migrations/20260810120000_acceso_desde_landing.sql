-- ---------------------------------------------------------------------------
-- El acceso pasa a resolverse contra el backend de la landing.
--
-- Hasta ahora esta app escuchaba el webhook de Stripe y decidía por su cuenta
-- quién tenía acceso. El contrato acordado entre los dos equipos
-- (`BRIEF-APP-INTEGRACION.md`) dice lo contrario, y es explícito:
--
--   «La app no cobra nada. No necesita Stripe, ni claves, ni webhooks.
--    Sólo pregunta al backend de la web quién ha pagado.»
--
-- Quien cobra es la landing, así que quien sabe quién ha pagado es la landing.
-- Dos fuentes de verdad sobre el acceso divergen tarde o temprano, y la que
-- gana es la que tiene el dinero. `entitlements` deja de ser fuente de verdad
-- y pasa a ser **caché local** de lo que responde su API — que es justo lo que
-- el contrato pide, para que sus caídas no dejen sin app a quien ya validamos.
-- ---------------------------------------------------------------------------

-- `has_access` admite null a propósito, y no es un descuido: null significa
-- «la landing todavía no nos lo ha dicho», que no es lo mismo que «no tiene
-- acceso». Con `not null default false`, cada fila escrita por otra vía —el
-- webhook antiguo, o una prueba— nacería sin acceso y dejaría fuera a quien sí
-- ha pagado. Null deja que se caiga al respaldo por `status`.
alter table public.entitlements
  add column has_access boolean,
  add column last_checked_at timestamptz;

-- `has_access` y no `status`, por indicación expresa del contrato (§3.2):
--
--   «Usad hasAccess, no status. El backend lo calcula (active o past_due →
--    true). Si mañana cambian las reglas de gracia, la app no se entera.»
--
-- Importa de verdad: su `past_due` SÍ concede acceso —es la gracia por impago—
-- y nuestro `concedeAcceso()` lo excluía. Decidirlo por nuestra cuenta sería
-- cerrarle la app a alguien a quien ellos siguen considerando cliente.
comment on column public.entitlements.has_access is
  'Lo calcula el backend de la landing. Es lo que decide el acceso, no `status`.';

comment on column public.entitlements.last_checked_at is
  'Última consulta a /api/access/status. Se revalida a diario, no en cada pantalla.';

-- Su backend usa `incomplete`, que nuestro check no contemplaba.
alter table public.entitlements
  drop constraint entitlements_status_check;

alter table public.entitlements
  add constraint entitlements_status_check
  check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none'));

comment on table public.entitlements is
  'Caché local del acceso. La fuente de verdad es el backend de la landing.';

-- ---------------------------------------------------------------------------
-- Guarda lo que respondió la landing.
--
-- En SQL y no en la aplicación por lo mismo que `apply_stripe_entitlement`:
-- «lee, compara y escribe» desde el servidor abre una ventana entre la lectura
-- y la escritura, y dos peticiones del mismo usuario podrían pisarse. Aquí es
-- una sola sentencia atómica.
--
-- El WHERE del ON CONFLICT descarta respuestas viejas: si dos pestañas
-- consultan a la vez y la lenta contesta después, no puede revivir un estado
-- anterior.
--
-- `p_user_id` se aplica solo cuando llega, y nunca se borra. Es lo que vincula
-- la compra con la cuenta de Google **aunque los correos no coincidan**: el
-- token ya demostró que esa persona pagó, así que el emparejado por email deja
-- de hacer falta. Ese desajuste era el único agujero por el que alguien podía
-- pagar y quedarse fuera.
-- ---------------------------------------------------------------------------
create or replace function public.apply_landing_entitlement(
  p_email extensions.citext,
  p_status text,
  p_plan text,
  p_source text,
  p_current_period_end timestamptz,
  p_has_access boolean,
  p_checked_at timestamptz,
  p_user_id uuid
)
returns setof public.entitlements
language sql
security definer
set search_path = ''
as $$
  insert into public.entitlements as e (
    email, status, plan, source, current_period_end,
    has_access, last_checked_at, user_id
  )
  values (
    p_email, p_status, p_plan, p_source, p_current_period_end,
    p_has_access, p_checked_at, p_user_id
  )
  on conflict (email) do update
     set status             = excluded.status,
         plan               = coalesce(excluded.plan, e.plan),
         source             = coalesce(excluded.source, e.source),
         current_period_end = excluded.current_period_end,
         has_access         = excluded.has_access,
         last_checked_at    = excluded.last_checked_at,
         user_id            = coalesce(excluded.user_id, e.user_id),
         updated_at         = pg_catalog.now()
   where e.last_checked_at is null
      or e.last_checked_at <= excluded.last_checked_at
  returning e.*;
$$;

revoke all on function public.apply_landing_entitlement(
  extensions.citext, text, text, text, timestamptz, boolean, timestamptz, uuid
) from public;

grant execute on function public.apply_landing_entitlement(
  extensions.citext, text, text, text, timestamptz, boolean, timestamptz, uuid
) to service_role;

comment on function public.apply_landing_entitlement(
  extensions.citext, text, text, text, timestamptz, boolean, timestamptz, uuid
) is
  'Guarda en caché la respuesta del backend de la landing y vincula la cuenta.';

-- ---------------------------------------------------------------------------
-- Las compras ya registradas por el webhook de Stripe conservaban su acceso en
-- `status`. Se traduce a `has_access` con la misma regla que aplica la landing
-- (`active` o `past_due`), para que nadie pierda el acceso al desplegar esto.
-- ---------------------------------------------------------------------------
update public.entitlements
   set has_access = status in ('active', 'trialing', 'past_due');
