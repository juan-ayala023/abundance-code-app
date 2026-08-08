-- Marca temporal del último evento de Stripe aplicado a cada entitlement.
--
-- Stripe no garantiza el orden de entrega de los webhooks. Sin esta columna,
-- un `customer.subscription.updated` retrasado puede pisar una cancelación ya
-- procesada y devolverle el acceso a quien lo canceló — o al revés, quitárselo
-- a quien acaba de renovar.
--
-- La idempotencia por `stripe_events` evita procesar DOS VECES el mismo evento;
-- esto evita procesar EN ORDEN EQUIVOCADO dos eventos distintos. Son problemas
-- diferentes y hacen falta las dos defensas.

alter table public.entitlements
  add column last_event_at timestamptz;

comment on column public.entitlements.last_event_at is
  'Fecha del evento de Stripe aplicado. Los eventos anteriores a esta fecha se descartan.';

-- ---------------------------------------------------------------------------
-- Aplicación de un evento de Stripe sobre el entitlement.
--
-- Va en SQL y no en la aplicación porque "lee, compara y escribe" desde el
-- servidor abre una ventana entre la lectura y la escritura: dos webhooks
-- simultáneos del mismo cliente podrían pisarse. Aquí es una sola sentencia
-- atómica.
--
-- El WHERE del ON CONFLICT es la defensa contra el desorden: si ya se aplicó
-- un evento posterior, la actualización simplemente no ocurre.
--
-- `user_id` no aparece en el SET a propósito: la vinculación con la cuenta la
-- hace claim_entitlement() y un webhook no debe deshacerla.
-- ---------------------------------------------------------------------------
create or replace function public.apply_stripe_entitlement(
  p_email extensions.citext,
  p_status text,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_end timestamptz,
  p_event_at timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.entitlements as e (
    email, status, plan, stripe_customer_id, stripe_subscription_id,
    current_period_end, source, last_event_at
  )
  values (
    p_email, p_status, p_plan, p_stripe_customer_id, p_stripe_subscription_id,
    p_current_period_end, 'stripe', p_event_at
  )
  on conflict (email) do update
     set status                 = excluded.status,
         plan                   = coalesce(excluded.plan, e.plan),
         stripe_customer_id     = coalesce(excluded.stripe_customer_id, e.stripe_customer_id),
         stripe_subscription_id = coalesce(excluded.stripe_subscription_id, e.stripe_subscription_id),
         current_period_end     = excluded.current_period_end,
         source                 = 'stripe',
         last_event_at          = excluded.last_event_at,
         updated_at             = pg_catalog.now()
   where e.last_event_at is null
      or e.last_event_at <= excluded.last_event_at;
$$;

-- Solo el servidor. Ningún rol público puede invocarla.
revoke all on function public.apply_stripe_entitlement(
  extensions.citext, text, text, text, text, timestamptz, timestamptz
) from public;

grant execute on function public.apply_stripe_entitlement(
  extensions.citext, text, text, text, text, timestamptz, timestamptz
) to service_role;
