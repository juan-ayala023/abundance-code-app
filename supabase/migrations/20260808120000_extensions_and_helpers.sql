-- Extensiones y utilidades compartidas.
--
-- citext: el email es la clave de emparejamiento entre la compra en Stripe y
-- el login de Google. Comparar con mayúsculas/minúsculas sensibles produciría
-- usuarios que pagaron y no pueden entrar (CLAUDE.md §3).

create extension if not exists citext with schema extensions;

-- Mantiene updated_at sin depender de que la aplicación se acuerde.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: refresca updated_at.';
