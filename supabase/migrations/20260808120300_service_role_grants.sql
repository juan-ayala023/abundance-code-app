-- Privilegios de service_role.
--
-- Con "Automatically expose new tables" desactivado, NINGÚN rol del Data API
-- recibe privilegios al crear una tabla, y eso incluye a service_role.
--
-- Saltarse RLS y tener privilegios son cosas distintas: service_role ignora las
-- políticas, pero sin GRANT el motor responde "permission denied" antes de
-- llegar a evaluarlas. Sin esta migración el webhook de Stripe no podría
-- escribir en entitlements.

grant usage on schema public to service_role;

grant all privileges on table public.profiles to service_role;
grant all privileges on table public.entitlements to service_role;
grant all privileges on table public.portals to service_role;
grant all privileges on table public.daily_activations to service_role;
grant all privileges on table public.guidance_queries to service_role;
grant all privileges on table public.stripe_events to service_role;
