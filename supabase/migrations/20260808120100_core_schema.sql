-- Esquema principal (CLAUDE.md §6).
-- Las políticas RLS y los privilegios van en la migración siguiente.

-- ---------------------------------------------------------------------------
-- profiles: espejo de auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  full_name text,
  locale text not null default 'es' check (locale in ('es', 'en')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Espejo de auth.users. Se rellena por trigger.';

-- Crea el perfil en cuanto nace el usuario, para que ninguna ruta tenga que
-- comprobar "¿existe ya el perfil?" antes de leerlo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email::extensions.citext,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- entitlements: fuente de verdad del acceso.
-- Escritura EXCLUSIVA de service_role (webhook de Stripe).
-- ---------------------------------------------------------------------------
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique,
  user_id uuid references auth.users (id) on delete set null,
  status text not null
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.entitlements is
  'Fuente de verdad del acceso. Emparejada por email. Solo la escribe el webhook.';

create index entitlements_user_id_idx on public.entitlements (user_id);
create index entitlements_stripe_customer_id_idx
  on public.entitlements (stripe_customer_id);
create index entitlements_stripe_subscription_id_idx
  on public.entitlements (stripe_subscription_id);

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- portals: registro principal por usuario
-- ---------------------------------------------------------------------------
create table public.portals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,

  full_name text,

  -- date y time PUROS, nunca timestamptz: ese fue el bug de desplazamiento de
  -- fecha del sistema anterior (CLAUDE.md §6). El instante UTC se deriva en el
  -- servidor combinando birth_date + birth_time + tz.
  birth_date date,
  birth_time time,
  time_unknown boolean not null default false,

  birth_country text,
  birth_city text,
  lat numeric(9, 6) check (lat between -90 and 90),
  lng numeric(9, 6) check (lng between -180 and 180),
  tz text,

  chart jsonb,
  chart_version text,
  chart_computed_at timestamptz,

  base_reading jsonb,
  base_reading_at timestamptz,

  utm jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Si la hora es desconocida no puede haber hora guardada: evita que la carta
  -- se calcule con una hora inventada y se presente como precisa.
  constraint portals_hora_coherente
    check (not time_unknown or birth_time is null)
);

comment on table public.portals is 'Un portal por usuario: datos de nacimiento, carta y lectura base.';
comment on column public.portals.birth_time is
  'Hora local de nacimiento, sin zona. Null si time_unknown.';
comment on column public.portals.tz is
  'Identificador IANA resuelto para la fecha y el lugar de nacimiento.';

create trigger portals_set_updated_at
  before update on public.portals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_activations
-- ---------------------------------------------------------------------------
create table public.daily_activations (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  content jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (portal_id, day_number)
);

-- ---------------------------------------------------------------------------
-- guidance_queries
-- ---------------------------------------------------------------------------
create table public.guidance_queries (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,
  question text not null,
  answer text,
  model text,
  tokens integer,
  created_at timestamptz not null default now()
);

comment on column public.guidance_queries.tokens is
  'Tokens consumidos. Necesario para costear y para el rate limit (CLAUDE.md §8).';

create index guidance_queries_portal_created_idx
  on public.guidance_queries (portal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- stripe_events: idempotencia del webhook
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_events is
  'Un id de evento de Stripe procesado. La PK es lo que hace el webhook idempotente.';
