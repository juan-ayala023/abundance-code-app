-- ---------------------------------------------------------------------------
-- portals.display_tz: la zona horaria de donde está la persona.
--
-- El día del portal (y con él la activación de hoy y el contador de consultas)
-- se calculaba con la zona de la CIUDAD DE NACIMIENTO. Quien nació en Bogotá y
-- vive en Sídney veía «22 de septiembre» cuando allí ya era 23 — señalado en la
-- revisión del 23 de septiembre de 2026.
--
-- La regla pasa a ser una sola: **el día es el del lugar donde está la
-- persona**. El navegador la envía la primera vez que entra y se guarda aquí
-- para que el servidor pueda calcular igual sin él delante. Mientras esté
-- vacía se sigue usando `tz` (la de nacimiento), que es mejor que UTC.
-- ---------------------------------------------------------------------------

alter table public.portals
  add column if not exists display_tz text;

comment on column public.portals.display_tz is
  'Zona horaria del dispositivo de la persona. Manda sobre tz para contar el día.';
