import { gradoEnSigno, signoDe, type Carta, type Cuerpo, type Signo } from './types'

/**
 * Las cinco áreas del producto, ancladas cada una a su lugar en la carta.
 *
 * Las áreas vienen del producto anterior y el usuario ya las conoce, pero en
 * pantalla eran cinco iconos con su nombre: los mismos para todo el mundo, sin
 * decir nada de quien miraba y sin llevar a ninguna parte.
 *
 * Y sin embargo cada una **tiene** un sitio concreto en astrología. El dinero se
 * mira en la casa 2, los vínculos en la 7, el propósito en el Medio Cielo. Eso
 * ya está calculado en la carta de cada persona: no hacía falta pedirle nada al
 * modelo ni inventar una correspondencia, solo ir a buscarlo.
 *
 * ---
 *
 * **Por qué cada área tiene dos significadores y no uno.**
 *
 * Las casas y los ángulos dependen de la hora exacta de nacimiento: sin ella la
 * carta se calcula `partial` y no existen. Un área anclada solo a una casa se
 * quedaría muda para toda esa gente, que no es poca.
 *
 * Así que cada área lleva un respaldo planetario, y no es un premio de consuelo:
 * son los significadores clásicos de ese mismo asunto. Júpiter habla de
 * abundancia tanto como la casa 2; Venus de los vínculos tanto como la casa 7.
 * Con hora se enseña la casa, que es más fina; sin ella, el planeta, que sigue
 * siendo verdad.
 */

/** Dónde se mira un área en la carta. */
type Significador =
  | { tipo: 'casa'; numero: number }
  | { tipo: 'medioCielo' }
  | { tipo: 'cuerpo'; cuerpo: Cuerpo }

export type Area = {
  clave: string
  /** Lo que se enseña cuando hay hora de nacimiento. */
  principal: Significador
  /** Lo que se enseña cuando no la hay. Nunca depende de las casas. */
  respaldo: Significador
}

export const AREAS: readonly Area[] = [
  {
    clave: 'abundancia',
    // Casa 2: los recursos propios, lo que uno gana y con qué cuenta.
    principal: { tipo: 'casa', numero: 2 },
    respaldo: { tipo: 'cuerpo', cuerpo: 'jupiter' },
  },
  {
    clave: 'decisiones',
    /*
     * Mercurio y no la casa 3, incluso teniendo hora. Cómo alguien decide es
     * cómo piensa, y eso es Mercurio: la casa 3 habla del entorno cercano y del
     * aprendizaje, que es otra cosa. Aquí lo fino es el planeta.
     */
    principal: { tipo: 'cuerpo', cuerpo: 'mercurio' },
    respaldo: { tipo: 'cuerpo', cuerpo: 'mercurio' },
  },
  {
    clave: 'proposito',
    // El Medio Cielo: hacia dónde apunta la vida cuando se mira de lejos.
    principal: { tipo: 'medioCielo' },
    respaldo: { tipo: 'cuerpo', cuerpo: 'sol' },
  },
  {
    clave: 'bloqueos',
    // Saturno: el límite, lo que cuesta y la lección que se repite.
    principal: { tipo: 'cuerpo', cuerpo: 'saturno' },
    respaldo: { tipo: 'cuerpo', cuerpo: 'saturno' },
  },
  {
    clave: 'relaciones',
    // Casa 7: el otro, el vínculo de tú a tú.
    principal: { tipo: 'casa', numero: 7 },
    respaldo: { tipo: 'cuerpo', cuerpo: 'venus' },
  },
]

export type AnclaDeArea = {
  /** Qué se está mirando: `casa`, `medioCielo` o el nombre de un planeta. */
  que: 'casa' | 'medioCielo' | Cuerpo
  /** Número de casa, solo cuando `que === 'casa'`. */
  numero?: number
  signo: Signo
  grado: number
}

/**
 * Dónde cae un área en esta carta concreta.
 *
 * Devuelve `null` cuando ni el significador ni su respaldo se pueden resolver.
 * No se inventa nada: un área sin ancla se pinta sin su línea, con su nombre,
 * como estaba antes.
 */
export function anclaDeArea(carta: Carta, area: Area): AnclaDeArea | null {
  const exacta = carta.precision === 'exact'
  return resolver(carta, exacta ? area.principal : area.respaldo) ?? resolver(carta, area.respaldo)
}

function resolver(carta: Carta, significador: Significador): AnclaDeArea | null {
  switch (significador.tipo) {
    case 'casa': {
      // Las cúspides van en orden, así que la casa N es el índice N-1.
      const longitud = carta.cuspides[significador.numero - 1]
      if (longitud === undefined) return null

      return {
        que: 'casa',
        numero: significador.numero,
        signo: signoDe(longitud),
        grado: Math.floor(gradoEnSigno(longitud)),
      }
    }

    case 'medioCielo': {
      if (carta.medioCielo === null) return null

      return {
        que: 'medioCielo',
        signo: signoDe(carta.medioCielo),
        grado: Math.floor(gradoEnSigno(carta.medioCielo)),
      }
    }

    case 'cuerpo': {
      const planeta = carta.planetas.find((p) => p.cuerpo === significador.cuerpo)
      if (!planeta) return null

      return {
        que: significador.cuerpo,
        signo: signoDe(planeta.longitud),
        grado: Math.floor(gradoEnSigno(planeta.longitud)),
      }
    }
  }
}
