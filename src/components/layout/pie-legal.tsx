import { getTranslations } from "next-intl/server";

import { SelectorIdioma } from "@/components/layout/selector-idioma";
import { getPublicEnv } from "@/lib/env/public";

/**
 * Enlaces a los documentos legales.
 *
 * Los textos **no viven aquí**: viven en la landing, que es quien vende y quien
 * cobra. Una segunda copia en esta app acabaría divergiendo de la primera, y
 * dos versiones de una política de privacidad que no dicen lo mismo son peor
 * que una sola.
 *
 * Aun así tienen que ser alcanzables desde aquí: la app es donde el usuario
 * pasa el tiempo y —sobre todo— es donde la política de reembolsos le dice que
 * vaya a cancelar su suscripción.
 *
 * Las rutas salen de `NEXT_PUBLIC_LANDING_URL` y no están escritas a mano: el
 * dominio ya cambió una vez, y un enlace muerto en el pie legal es de los que
 * nadie revisa hasta que hace falta.
 */

/*
 * Las páginas HTML de la landing, no los PDF de `/img/`. Hasta septiembre de
 * 2026 se enlazaban los PDF; el equipo de la landing los comparó con las
 * páginas y no dicen lo mismo: los PDF nombran otra jurisdicción y otra
 * sociedad, y llevan «[email de soporte]» sin rellenar. Las páginas son las que
 * mantienen. Si algún día cambian de ruta, este es el único sitio a tocar.
 */
const DOCUMENTOS = [
  ["privacidad", "privacy"],
  ["terminos", "terms"],
  ["reembolsos", "refund"],
  ["aviso", "disclaimer"],
] as const;

export async function PieLegal({ className }: { className?: string }) {
  const landing = getPublicEnv().NEXT_PUBLIC_LANDING_URL.replace(/\/$/, "");
  const t = await getTranslations("legal");

  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-8 text-xs text-tinta-tenue ${className ?? ""}`}
    >
      <SelectorIdioma />

      {DOCUMENTOS.map(([clave, ruta]) => (
        <a
          key={ruta}
          href={`${landing}/${ruta}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 transition-colors hover:text-tinta-suave hover:underline"
        >
          {t(clave)}
        </a>
      ))}

      <span>© {new Date().getFullYear()} Abundance Code</span>
    </footer>
  );
}
