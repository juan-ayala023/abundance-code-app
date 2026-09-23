import { KeyRound, Mail, PencilLine, Sparkles, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { idiomaActual } from "@/i18n/idioma";

import { cerrarSesion } from "@/app/actions";
import { abrirPortalDeFacturacion } from "./actions";
import { NombreEditable } from "@/components/cuenta/nombre-editable";
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

      {/*
        Una sola tarjeta de estado, no tres fichas.

        El documento del 23 de septiembre pidió unir «Estado del portal» y «Día
        actual»: eran dos fichas que decían medias verdades por separado —una
        sin saber en qué día va, otra sin saber si el portal sigue activo— y
        obligaban a leer las dos para entender una cosa sola. La fecha de
        activación se va con ellas, que es de lo que cuelga el contador.
      */}
      <Tarjeta className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-light">
            {[
              entitlement
                ? t(`estados.${entitlement.status}` as never) || entitlement.status
                : t("estados.ninguno"),
              ciclo ? tNav("dia", { dia: ciclo.dia, total: ciclo.total }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </h2>
          <p className="text-sm text-tinta-tenue">
            {t("activadoEl", {
              fecha: fechaDeInstante(portal?.created_at ?? perfil?.created_at, idioma),
            })}
          </p>
        </div>

        {ciclo ? (
          <div
            role="progressbar"
            aria-valuenow={ciclo.progreso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("completado", { progreso: ciclo.progreso })}
            className="h-2 overflow-hidden rounded-full bg-oro-palido"
          >
            <div className="h-full rounded-full bg-oro" style={{ width: `${ciclo.progreso}%` }} />
          </div>
        ) : null}
      </Tarjeta>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {/*
          El nombre que la persona escribió al dar sus datos manda sobre el que
          trajo Google: es el que se cambia desde aquí mismo y el que usan las
          lecturas. Si no hay portal todavía, el de Google.
        */}
        <Tarjeta className="flex min-w-0 items-start gap-4">
          <Insignia Icono={User} />
          <NombreEditable nombre={portal?.full_name ?? perfil?.full_name ?? "—"} />
        </Tarjeta>
        <Dato Icono={Mail} etiqueta={t("email")} valor={perfil?.email ?? "—"} />
        <Dato Icono={Sparkles} etiqueta={t("plan")} valor={plan} />
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
          {/*
            Ya no lleva al formulario de alta: llevaba a la pantalla que
            recalcula la carta, y el documento del 23 de septiembre pide que
            fecha, hora y lugar pasen por soporte. Lo que se invalidaría no es
            poca cosa —la carta, la lectura base y el retrato—, así que se pide
            y alguien lo mira.
          */}
          <Link
            href="/cuenta/correccion"
            className="rounded-xl border border-borde bg-superficie px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo"
          >
            {t("solicitarCorreccion")}
          </Link>
        </Tarjeta>
      ) : null}

      {/*
        Cómo volver a entrar.

        Lo pidió el documento del 23 de septiembre, y responde a una pregunta
        que la gente se hace de verdad: no hay contraseña que recordar, así que
        no está claro qué pasa al cambiar de teléfono. Se dice en tres líneas
        en vez de dejar que cada uno lo descubra.
      */}
      <Tarjeta className="flex gap-4">
        <Insignia Icono={KeyRound} />
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-lg font-light">{t("volverAEntrar")}</h2>
          <p className="max-w-prose text-sm leading-relaxed text-tinta-suave">
            {t("volverAEntrarTexto")}
          </p>
        </div>
      </Tarjeta>

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
