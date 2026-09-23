-- ---------------------------------------------------------------------------
-- forecasts: el pronóstico de un periodo.
--
-- Encargo de Andrea (22 sept 2026): que la lectura deje de describir energías
-- y diga qué áreas se activan, cuándo y de qué forma podrían manifestarse.
--
-- Se guarda por periodo y no se reescribe, por las mismas razones que la
-- lectura base: cuesta dinero generarlo y, sobre todo, la persona vuelve a
-- leerlo durante el mes. `eventos` conserva el calendario calculado —las
-- fechas de los exactos, las lunaciones, las estaciones— para poder mostrar
-- las ventanas sin volver a calcular y para poder comprobar, más adelante, de
-- dónde salió cada fecha que se le enseñó a alguien.
--
-- Una fila por portal y fecha de inicio: `unique` impide que dos pestañas
-- abiertas a la vez generen dos pronósticos del mismo periodo (y lo cobren
-- dos veces).
-- ---------------------------------------------------------------------------

create table if not exists public.forecasts (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,

  -- Periodo cubierto, en fechas de calendario.
  desde date not null,
  hasta date not null,

  -- Lo que escribió el modelo (apertura, ventanas, secundarias, cierre) más
  -- sus traducciones, igual que `portals.base_reading`.
  content jsonb not null,

  -- El calendario tal y como lo calculó `calcularPronostico()`.
  eventos jsonb,

  model text,
  tokens integer,

  created_at timestamptz not null default now(),

  unique (portal_id, desde)
);

comment on table public.forecasts is
  'Pronóstico por periodo: ventanas con fechas calculadas e interpretación escrita.';
comment on column public.forecasts.eventos is
  'Calendario calculado (aspectos exactos, lunaciones, estaciones). Las fechas salen de aquí, no del modelo.';

create index if not exists forecasts_portal_desde_idx
  on public.forecasts (portal_id, desde desc);

alter table public.forecasts enable row level security;

-- El usuario lee los suyos. Los escribe el servidor con el cliente
-- administrativo, igual que las activaciones: no se concede insert.
grant select on public.forecasts to authenticated;
grant all privileges on table public.forecasts to service_role;

drop policy if exists forecasts_select_own on public.forecasts;
create policy forecasts_select_own on public.forecasts
  for select to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = forecasts.portal_id
        and p.user_id = (select auth.uid())
    )
  );
