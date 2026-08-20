-- ---------------------------------------------------------------------------
-- El retrato de la carta: quién es esta persona, planeta a planeta.
--
-- Va debajo de la rueda en `/carta`, y es contenido distinto de la lectura
-- base. La lectura base habla de TEMAS —abundancia, bloqueos, decisiones— y es
-- lo que el producto vende. El retrato recorre la carta pieza a pieza y explica
-- qué función cumple cada planeta en esta persona.
--
-- Columnas propias y no un campo dentro de `base_reading`, por dos razones:
--
--   1. Se generan por separado y en momentos distintos. La lectura base nace en
--      `/generando`, justo tras el onboarding; el retrato nace la primera vez
--      que alguien abre su carta, que puede ser semanas después. Con un solo
--      campo, escribir uno obligaría a leer y reescribir el otro, y dos
--      pestañas abiertas podrían borrarse mutuamente la mitad del contenido.
--
--   2. `asegurarRetrato()` se apoya en `is chart_reading null` para no pisar lo
--      que otra petición acabe de escribir. Esa guarda necesita una columna
--      propia: dentro de un jsonb compartido no hay nada que comprobar.
--
-- No hace falta tocar RLS ni grants: `portals` ya concede `select` y `update`
-- al dueño de la fila, y las políticas son por fila, no por columna.
-- ---------------------------------------------------------------------------

-- `if not exists` para que aplicarla dos veces no rompa nada. No es una manía:
-- estas dos columnas se pueden añadir desde el editor SQL del panel cuando el
-- CLI no está autenticado, y en ese caso `supabase db push` volverá a
-- ejecutarlas más tarde porque el historial de migraciones no las registró. Con
-- esto, esa segunda pasada es un no-op en vez de un error que deja el push a
-- medias.
alter table public.portals
  add column if not exists chart_reading jsonb,
  add column if not exists chart_reading_at timestamptz;

comment on column public.portals.chart_reading is
  'Retrato de la carta, planeta a planeta. Se genera una vez y no se regenera.';

comment on column public.portals.chart_reading_at is
  'Cuándo se generó el retrato. Null mientras no exista.';
