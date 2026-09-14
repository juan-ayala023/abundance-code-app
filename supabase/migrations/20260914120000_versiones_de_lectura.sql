-- ---------------------------------------------------------------------------
-- reading_versions: las lecturas que se retiran, conservadas.
--
-- Existe porque ahora se pueden corregir los datos de nacimiento (revisión de
-- septiembre de 2026). Al cambiar la fecha, la hora o el lugar, la carta deja
-- de describir el nacimiento de esa persona, y con ella la lectura base y el
-- retrato, que se escribieron sobre esa carta. Hay que volver a escribirlos.
--
-- Pero lo que ya leyó es suyo y no se tira: la versión anterior se guarda
-- aquí, con los datos de nacimiento sobre los que se escribió, y se puede
-- volver a leer desde la pantalla de la lectura. Es también la respuesta a
-- «cómo se guardará la versión anterior» si algún día se decide regenerar
-- lecturas con un tono nuevo: pasan por aquí.
--
-- Una tabla y no una columna `*_previous` en `portals`: una columna guarda
-- una versión; quien corrige dos veces perdería la primera.
-- ---------------------------------------------------------------------------

create table if not exists public.reading_versions (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,

  -- 'lectura' (base_reading) o 'retrato' (chart_reading).
  kind text not null check (kind in ('lectura', 'retrato')),
  content jsonb not null,

  -- Cuándo se escribió esa versión, si se sabe.
  generated_at timestamptz,

  -- Sobre qué nacimiento se escribió. Es lo que permite decir en pantalla
  -- «lectura escrita con los datos del 15 de julio de 1990, 08:30, Bogotá».
  birth_date date,
  birth_time time,
  time_unknown boolean not null default false,
  birth_city text,
  birth_country text,

  -- Por qué se retiró: 'correccion-nacimiento' hoy; queda sitio para otros.
  reason text not null default 'correccion-nacimiento',

  archived_at timestamptz not null default now()
);

comment on table public.reading_versions is
  'Lecturas y retratos retirados al corregir el nacimiento. Se conservan y se pueden releer.';

create index if not exists reading_versions_portal_archived_idx
  on public.reading_versions (portal_id, archived_at desc);

alter table public.reading_versions enable row level security;

-- El usuario lee sus versiones. Las escribe el servidor con el cliente
-- administrativo, igual que las activaciones: no se concede insert.
grant select on public.reading_versions to authenticated;
grant all privileges on table public.reading_versions to service_role;

drop policy if exists reading_versions_select_own on public.reading_versions;
create policy reading_versions_select_own on public.reading_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = reading_versions.portal_id
        and p.user_id = (select auth.uid())
    )
  );
