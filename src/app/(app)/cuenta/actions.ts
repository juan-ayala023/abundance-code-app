"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EstadoNombre } from "./estado";

import { entitlementDe, resolveAccess } from "@/lib/access/entitlement";
import { urlDelPortalDeFacturacion } from "@/lib/access/landing";
import { createClient } from "@/lib/supabase/server";

/**
 * Lleva al portal de facturación de Stripe.
 *
 * Cancelar, cambiar la tarjeta y ver facturas son tres pantallas que **no hay
 * que construir**: las sirve Stripe, y el backend de la landing es quien abre
 * la sesión porque es quien tiene el `stripe_customer_id`. Esta app no toca
 * Stripe ni necesita ninguna de sus claves.
 *
 * El correo sale de la sesión, nunca de un campo del formulario: si viniera del
 * cliente, cualquiera podría pedir el portal de otra persona y acabar viendo
 * —y cancelando— una suscripción ajena.
 */
export async function abrirPortalDeFacturacion() {
  const acceso = await resolveAccess();
  const entitlement = entitlementDe(acceso);

  if (!entitlement) redirect("/cuenta?portal=sin-compra");

  const portal = await urlDelPortalDeFacturacion(entitlement.email);

  // Sin URL no se inventa nada: se vuelve diciendo qué pasó.
  if (!portal.ok) {
    redirect(
      portal.motivo === "no-encontrado"
        ? "/cuenta?portal=sin-stripe"
        : "/cuenta?portal=error",
    );
  }

  redirect(portal.url);
}

/**
 * Cambia el nombre con el que le hablan las lecturas.
 *
 * Es el único dato del alta que se puede cambiar sin pasar por soporte, y la
 * razón es que no afecta a nada calculado: la carta sale de la fecha, la hora
 * y el lugar. Cambiar una letra del nombre no invalida nada.
 *
 * Se guarda en `portals.full_name` y no en el perfil: es el que usan las
 * lecturas, y el del perfil viene de Google.
 *
 * **Devuelve el nombre guardado en vez de redirigir.** Redirigiendo, la
 * pantalla volvía a pintarse con el nombre anterior: la ruta estaba en la
 * caché del navegador y se reutilizaba, así que el aviso «tu nombre quedó
 * guardado» salía encima del nombre viejo —la peor combinación posible—. Ni
 * `revalidatePath` lo evitaba. Devolviendo el valor, lo que se ve es lo que se
 * acaba de escribir, sin depender de ninguna caché.
 */
export async function guardarNombre(
  _previo: EstadoNombre,
  formData: FormData,
): Promise<EstadoNombre> {
  const nombre = (formData.get("nombre") ?? "").toString().trim().slice(0, 80);
  if (!nombre) return { nombre: null, error: null };

  const supabase = await createClient();
  const { data: portal } = await supabase
    .from("portals")
    .select("id")
    .maybeSingle();

  if (!portal) return { nombre: null, error: await textoDeCuenta("nombreError") };

  /*
   * Con `select` detrás: una actualización que no encuentra su fila no es un
   * error para Postgrest —devuelve cero filas y ningún mensaje—, así que sin
   * esto un fallo de permisos se vería como «tu nombre quedó guardado».
   */
  const { data: guardado, error } = await supabase
    .from("portals")
    .update({ full_name: nombre })
    .eq("id", portal.id)
    .select("full_name")
    .maybeSingle();

  if (error || !guardado) {
    console.error("[cuenta] no se pudo guardar el nombre", error);
    return { nombre: null, error: await textoDeCuenta("nombreError") };
  }

  /* El resto del portal también lo usa: las lecturas le hablan por su nombre. */
  revalidatePath("/cuenta");
  revalidatePath("/portal");

  return { nombre: guardado.full_name, error: null };
}

async function textoDeCuenta(clave: string): Promise<string> {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("cuenta");
  return t(clave as never);
}
