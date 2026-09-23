-- ---------------------------------------------------------------------------
-- La guía pasa de preguntas sueltas a conversaciones.
--
-- Documento del 23 de septiembre de 2026: cada consulta incluye la pregunta
-- inicial, su respuesta y **dos preguntas para profundizar sobre el mismo
-- tema**, todo guardado en el mismo hilo. Y el límite deja de ser diario: son
-- doce consultas al mes.
--
-- Dos columnas nuevas y ninguna fila que se toque:
--
--   · `thread_id` agrupa las filas de una misma conversación. La primera de un
--     hilo lleva su propio id, así que las consultas que ya existen quedan
--     como hilos de un solo mensaje, que es exactamente lo que fueron.
--
--   · `tipo` dice qué cuenta. Solo `consulta` gasta una de las doce: un
--     seguimiento va dentro de la que ya se pagó, y una aclaración —cuando la
--     guía pide un dato antes de responder— no se le cobra a nadie, porque la
--     pidió el sistema, no la persona.
-- ---------------------------------------------------------------------------

alter table public.guidance_queries
  add column if not exists thread_id uuid,
  add column if not exists tipo text not null default 'consulta';

-- Las filas anteriores: cada una es su propio hilo.
update public.guidance_queries set thread_id = id where thread_id is null;

alter table public.guidance_queries
  alter column thread_id set default gen_random_uuid(),
  alter column thread_id set not null;

alter table public.guidance_queries
  drop constraint if exists guidance_queries_tipo_check;

alter table public.guidance_queries
  add constraint guidance_queries_tipo_check
  check (tipo in ('consulta', 'seguimiento', 'aclaracion'));

comment on column public.guidance_queries.thread_id is
  'Agrupa la pregunta inicial con sus seguimientos. La primera fila del hilo lleva su propio id.';
comment on column public.guidance_queries.tipo is
  'consulta (gasta una de las doce del mes), seguimiento (va dentro de ella) o aclaracion (no gasta: la pidió el sistema).';

create index if not exists guidance_queries_thread_idx
  on public.guidance_queries (thread_id, created_at);
