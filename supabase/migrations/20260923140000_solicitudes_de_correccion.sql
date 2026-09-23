-- ---------------------------------------------------------------------------
-- correction_requests: corregir el nacimiento pasa por soporte.
--
-- Documento del 23 de septiembre de 2026: el nombre se cambia directamente,
-- pero la fecha, la hora y el lugar **no se recalculan automáticamente**. Y
-- con razón: al cambiarlos se invalida la carta y se archivan la lectura base
-- y el retrato, que es contenido que la persona ya leyó y pagó. Un dedo en el
-- teclado no debería poder hacer eso.
--
-- Así que se guarda la petición, alguien la mira, y solo después se recalcula.
-- Mientras tanto la persona conserva todo: su carta, sus lecturas y su
-- historial de consultas.
--
-- `confirmado` no es burocracia: son datos de nacimiento de una persona real,
-- y la casilla es lo que deja por escrito que quien los cambia es ella.
-- ---------------------------------------------------------------------------

create table if not exists public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,

  -- Qué hay ahora y qué debería haber, tal como los escribió la persona.
  dato_actual text not null,
  dato_correcto text not null,
  motivo text,
  confirmado boolean not null default false,

  -- pendiente → aprobada | rechazada. Lo mueve quien la atiende.
  estado text not null default 'pendiente',

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.correction_requests
  drop constraint if exists correction_requests_estado_check;

alter table public.correction_requests
  add constraint correction_requests_estado_check
  check (estado in ('pendiente', 'aprobada', 'rechazada'));

comment on table public.correction_requests is
  'Peticiones de corrección de datos de nacimiento. La carta solo se recalcula tras aprobarlas.';

create index if not exists correction_requests_portal_idx
  on public.correction_requests (portal_id, created_at desc);

create index if not exists correction_requests_pendientes_idx
  on public.correction_requests (created_at desc)
  where estado = 'pendiente';

alter table public.correction_requests enable row level security;

-- El usuario lee las suyas, para saber que su petición está en curso. Las
-- escribe el servidor con el cliente administrativo, igual que el resto del
-- contenido: no se concede insert.
grant select on public.correction_requests to authenticated;
grant all privileges on table public.correction_requests to service_role;

drop policy if exists correction_requests_select_own on public.correction_requests;
create policy correction_requests_select_own on public.correction_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.portals p
      where p.id = correction_requests.portal_id
        and p.user_id = (select auth.uid())
    )
  );
