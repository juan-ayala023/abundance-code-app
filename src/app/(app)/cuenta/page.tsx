import {
  Activity,
  CalendarDays,
  Mail,
  PencilLine,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { idiomaActual } from "@/i18n/idioma";

import { cerrarSesion } from "@/app/actions";
import { abrirPortalDeFacturacion } from "./actions";
import { Contenedor } from "@/components/layout/contenedor";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { Insignia, Tarjeta } from "@/components/layout/tarjeta";
import { ESTADO_CORTESIA } from "@/lib/access/cortesia";
import { urlDeCompra } from "@/lib/access/enlaces";
import { entitlementDe, resolveAccess } from "@/lib/access/entitlement";
import { nivelDeAcceso } from "@/lib/access/nivel";
import { diaDelCiclo } from "@/lib/lectura/ciclo";
import { CONSULTAS_GUIA_POR_MES, DIAS_DE_PORTAL } from "@/lib/lectura/schemas";
import { createClient } from "@/lib/supabase/server";
import { zonaDelPortal } from "@/lib/time/dia";
import {
  fechaDeCalendario,
  fechaDeInstante,
  horaDeReloj,
} from "@/lib/time/formato";

export const metadata: Metadata = {
  title: "Mi cuenta · Abundance Code",
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await getTranslations("cuenta");
  const tNav = await getTranslations("nav");
  const tSus = await getTranslations("suscripcion");
  const idioma = await idiomaActual();

  /** Lo que pudo salir mal al abrir el portal de facturación. */
  const avisoPortal =
    params.portal === "error"
      ? t("portalError")
      : params.portal === "sin-compra"
        ? t("portalSinCompra")
        : params.portal === "sin-stripe"
          ? t("portalSinStripe")
          : params.datos === "nombre"
            ? t("nombreGuardado")
            : undefined;

  const supabase = await createClient();
  const acceso = await resolveAccess();

  const [{ data: perfil }, { data: portal }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, created_at")
      .maybeSingle(),
    supabase
      .from("portals")
      .select(
        "created_at, tz, full_name, birth_date, birth_time, time_unknown, birth_city, birth_country",
      )
      .maybeSingle(),
  ]);

  const entitlement = entitlementDe(acceso);

  // El mismo contador que ve el usuario en el portal: se deriva de la fecha de
  // creación, no de una columna que pudiera quedar desincronizada.
  const ciclo = diaDelCiclo(portal?.created_at, portal ? zonaDelPortal(portal) : null);
  const nivel = nivelDeAcceso(entitlement);
  const esCortesia = entitlement?.status === ESTADO_CORTESIA;

  /*
   * El plan, dicho con palabras. Antes se pintaba `entitlement.plan` a secas,
   * que en una cortesía es `null` y salía como un guion: la revisión lo
   * señaló. Ahora cada situación tiene su frase, y el nombre del plan que
   * manda la landing —si lo manda— se enseña tal cual.
   */
  const plan = !entitlement
    ? t("planes.ninguno")
    : esCortesia
      ? t("planes.cortesia")
      : entitlement.plan
        ? // Su `plan` es una clave («monthly»): con palabras si la conocemos.
          entitlement.plan === "monthly"
          ? t("planes.monthly")
          : entitlement.plan
        : nivel === "completo"
          ? t("planes.suscripcion")
          : t("planes.inactivo");

  return (
    <Contenedor>
      <EncabezadoPagina titulo={t("titulo")} descripcion={t("descripcion")} />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {/*
          El nombre que la persona escribió al dar sus datos manda sobre el que
          trajo Google: es el que se corrige desde esta pantalla y el que usan
          las lecturas. Si no hay portal todavía, el de Google.
        */}
        <Dato
          Icono={User}
          etiqueta={t("nombre")}
          valor={portal?.full_name ?? perfil?.full_name ?? "—"}
        />
        <Dato Icono={Mail} etiqueta={t("email")} valor={perfil?.email ?? "—"} />
        <Dato Icono={Sparkles} etiqueta={t("plan")} valor={plan} />
        <Dato
          Icono={CalendarDays}
          etiqueta={t("fechaActivacion")}
          valor={fechaDeInstante(
            portal?.created_at ?? perfil?.created_at,
            idioma,
          )}
        />
        {/*
          El original matiza el estado: «Activo · primeros 30 días». Distingue
          estar dentro del ciclo inicial de tener una suscripción en marcha, que
          es justo lo que decide si la guía sigue abierta.
        */}
        <Dato
          Icono={Activity}
          etiqueta={t("estadoPortal")}
          valor={
            entitlement
              ? [
                  t(`estados.${entitlement.status}` as never) ||
                    entitlement.status,
                  ciclo && !ciclo.terminado
                    ? t("primerosDias", { total: ciclo.total })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "—"
          }
        />
        {/*
          El progreso del ciclo vivía en una tarjeta propia en `/portal`, con un
          número enorme y una barra que avanzaba. Aquí va dentro de la ficha que
          ya mostraba el día: el mismo dato, sin ser lo primero que se ve al
          entrar al producto. Ver el comentario de `portal/page.tsx`.
        */}
        <Dato
          Icono={Sun}
          etiqueta={t("diaActual")}
          valor={
            ciclo ? tNav("dia", { dia: ciclo.dia, total: ciclo.total }) : "—"
          }
          progreso={
            ciclo
              ? {
                  porcentaje: ciclo.progreso,
                  etiqueta: t("completado", { progreso: ciclo.progreso }),
                }
              : undefined
          }
        />
      </div>

      {/*
        Falta «Código activado», que la app anterior sí muestra. No se pinta
        porque `activation_codes` no está modelado: depende de si se migran los
        usuarios del sistema anterior, que sigue sin decidirse. Inventar un
        código sería peor que su ausencia — el usuario lo conserva y lo compara.
      */}
      <Tarjeta className="bg-oro-palido/40 text-sm leading-relaxed text-tinta-suave">
        {nivel === "solo-lectura"
          ? tSus("mensaje")
          : esCortesia
            ? t("incluyeCortesia", { consultas: CONSULTAS_GUIA_POR_MES })
            : t("incluye", {
                total: DIAS_DE_PORTAL,
                consultas: CONSULTAS_GUIA_POR_MES,
              })}
      </Tarjeta>

      {/*
        `past_due` conserva el acceso (es la gracia por impago que decide la
        landing), pero hay que decirle que arregle la tarjeta desde el portal de
        Stripe: si va a la página de precios, su backend le abre un checkout
        nuevo y paga la entrada otra vez. Lo avisó el equipo de la landing el
        14 de septiembre de 2026.
      */}
      {entitlement?.status === "past_due" && (
        <Tarjeta className="border-oro/60 text-sm leading-relaxed text-tinta-suave">
          {t("pagoPendiente")}
        </Tarjeta>
      )}

      {/*
        Los datos de nacimiento, y la puerta para corregirlos.

        No existía: `/onboarding` redirige a `/portal` en cuanto hay datos, así
        que el enlace «revisar mis datos» de la carta llevaba a una pantalla que
        devolvía al portal. La revisión de septiembre de 2026 pidió cumplir la
        promesa de poder corregirlos. Lo que pasa con las lecturas al cambiarlos
        se explica en la propia pantalla de edición.
      */}
      {portal?.birth_date ? (
        <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Insignia Icono={PencilLine} />
            <div className="min-w-0">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                {t("nacimiento")}
              </p>
              <p className="wrap-anywhere text-lg font-light">
                {fechaDeCalendario(portal.birth_date, idioma)}
                {portal.time_unknown
                  ? ` · ${t("sinHora")}`
                  : portal.birth_time
                    ? ` · ${horaDeReloj(portal.birth_time)}`
                    : ""}
                {portal.birth_city ? ` · ${portal.birth_city}` : ""}
                {portal.birth_country ? `, ${portal.birth_country}` : ""}
              </p>
            </div>
          </div>
          <Link
            href="/onboarding?editar=1"
            className="rounded-xl border border-borde bg-superficie px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo"
          >
            {t("corregirNacimiento")}
          </Link>
        </Tarjeta>
      ) : null}

      {avisoPortal ? (
        <p
          role="alert"
          className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
        >
          {avisoPortal}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        {/*
          «Continuar con suscripción» lleva a la página de precios de la
          landing, que abre la oferta de entrada (49 $). Eso solo tiene sentido
          para quien NO tiene acceso vigente. A un suscriptor activo le
          proponía volver a comprar lo que ya paga, y a una cortesía le ofrecía
          entrar por la puerta de pago. La revisión lo señaló; ahora solo lo ve
          quien lo necesita. Quien está activo gestiona desde Stripe, abajo.
        */}
        {nivel === "solo-lectura" && !esCortesia ? (
          <a
            href={urlDeCompra()}
            className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
          >
            {tSus("continuar")}
          </a>
        ) : null}

        {/*
          Cancelar, cambiar la tarjeta y ver facturas los sirve Stripe. No hay
          que construir ninguna de esas pantallas, y esta app no necesita
          ninguna clave suya: la sesión del portal la abre el backend de la
          landing, que es quien tiene el cliente de Stripe.
        */}
        {/*
          Nada que gestionar en una cortesía: no hay compra, ni cliente de
          Stripe, ni tarjeta. El botón habría abierto un portal que su backend no
          puede crear, y el único resultado visible sería un aviso de error en la
          pantalla que existe para dar confianza.
        */}
        {entitlement && !esCortesia ? (
          <form action={abrirPortalDeFacturacion}>
            <button
              type="submit"
              className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
            >
              {t("gestionar")}
            </button>
          </form>
        ) : null}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            {tNav("cerrarSesion")}
          </button>
        </form>
      </div>
    </Contenedor>
  );
}

function Dato({
  Icono,
  etiqueta,
  valor,
  progreso,
}: {
  Icono: typeof User;
  etiqueta: string;
  valor: string;
  /**
   * Barra de progreso opcional. Solo la pasa la ficha del día; el resto de
   * datos de esta pantalla no son cantidades y no llevan barra.
   *
   * La etiqueta viene ya traducida desde arriba en vez de resolverla aquí: el
   * componente padre ya tiene el traductor cargado, y hacer `Dato` asíncrono
   * por una sola cadena añadiría una espera a cada una de las seis fichas.
   */
  progreso?: { porcentaje: number; etiqueta: string };
}) {
  return (
    /*
      `min-w-0` no es decorativo: un elemento de rejilla vale por defecto
      `min-width: auto`, así que no puede encogerse por debajo de su contenido.
      Sin esto, un email largo ensanchaba la tarjeta más allá de la pantalla y
      el móvil acababa con desplazamiento horizontal.
    */
    <Tarjeta className="flex min-w-0 items-center gap-4">
      <Insignia Icono={Icono} />
      {/*
        `flex-1` para que la barra de progreso ocupe el ancho de la tarjeta y no
        el del texto que tiene encima, que cambia de largo según el día.
      */}
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
          {etiqueta}
        </p>
        {/*
          El valor se parte en varias líneas; antes se truncaba con puntos
          suspensivos. Truncar aquí es cortar justo lo que esta pantalla existe
          para enseñar: en un teléfono, un correo corriente ya no cabía entero y
          el usuario no podía leer el suyo. `anywhere` porque un correo no tiene
          espacios donde partir.
        */}
        <p className="wrap-anywhere text-lg font-light">{valor}</p>

        {/*
          La barra es fina y sin porcentaje al lado a propósito: aquí solo tiene
          que situar, no marcar el paso. El número exacto ya está arriba, en
          «Día N de 30».
        */}
        {progreso ? (
          <div
            role="progressbar"
            aria-valuenow={progreso.porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progreso.etiqueta}
            className="mt-2.5 h-1 overflow-hidden rounded-full bg-fondo-hondo"
          >
            <div
              className="h-full rounded-full bg-oro-claro"
              style={{ width: `${progreso.porcentaje}%` }}
            />
          </div>
        ) : null}
      </div>
    </Tarjeta>
  );
}
