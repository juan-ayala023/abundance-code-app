# Proveedor de cálculo de la carta natal

Evaluación para cerrar la única decisión que bloquea todo lo que viene después
—IA, lectura base, activaciones—, porque nada de eso se puede construir sobre
cartas de mentira.

Estado: **decidido e implementado.** Se eligió la opción A (cálculo local). El
adaptador vive en `src/lib/astrology/local.ts` con 25 pruebas. No se contrató
nada ni se envía ningún dato a terceros.

## Las dos condiciones que ya estaban fijadas

De `docs/CONTINUIDAD.md` §4:

1. Que soporte **Placidus**.
2. Que sus **condiciones sobre datos personales** sean aceptables, porque le
   enviaríamos fecha, hora y lugar de nacimiento de clientes reales.

La segunda es la que decide, y conviene decir por qué. La terna fecha + hora +
lugar de nacimiento identifica a una persona de forma prácticamente única y es
un dato que no se puede rotar como una contraseña: si se filtra, se filtró para
siempre. Cualquier proveedor externo al que se lo mandemos pasa a ser un
encargado del tratamiento del que respondemos nosotros ante el cliente.

## Lo que cambia respecto a la decisión registrada

La decisión en vigor es **«API externa primero»**, tomada para tener cartas
reales en días en vez de semanas y aplazar sin coste la licencia de Swiss
Ephemeris. El motivo era bueno. Lo que no se contempló entonces es que existe
una tercera vía que consigue lo mismo —cartas reales en días, sin licencia que
pagar— **sin sacar los datos de nacimiento de nuestros servidores**.

Por eso se propone revisarla. Explícitamente, no por descuido.

## Opciones

### A. Cálculo local con `circular-natal-horoscope-js` — recomendada

Librería JavaScript que calcula la carta en nuestro propio proceso.

- **Licencia: Unlicense (dominio público).** Sin coste, sin obligaciones, sin
  contrato. Y si el proyecto se abandonara, podemos incorporar el código al
  repo legalmente y mantenerlo nosotros.
- **Placidus**, más Koch, Campanus, Whole Sign, Equal, Regiomontanus y
  Topocentric.
- Devuelve exactamente lo que pide nuestro `Carta`: posiciones planetarias,
  retrogradación, ascendente, medio cielo, las 12 cúspides y los aspectos.
- **Efemérides Moshier**: desviación por debajo de **1 segundo de arco** en los
  planetas y unos pocos en la Luna, sobre el rango 3000 a.C. – 3000 d.C.
- Coste recurrente: **0 $**. Sin cuota, sin límite de peticiones, sin factura
  que escale con los clientes.
- **Ningún dato de nacimiento sale de nuestros servidores.** La condición 2 deja
  de ser un riesgo que gestionar y pasa a no existir.

Sobre la precisión, para que quede dimensionada: una carta se muestra al minuto
de arco, que son 60 segundos de arco. El error de Moshier es unas 60 veces más
fino que lo que el usuario llega a ver. El único caso en que importaría es un
planeta a menos de 1 segundo de arco de un cambio de signo, del orden de uno
entre un millón de cartas por planeta.

### B. API externa (astrology-api.io y equivalentes)

- Placidus: sí, junto a 20 y pico sistemas más.
- Precisión: Swiss Ephemeris, 0,001 segundos de arco. Muy superior a lo
  necesario.
- Precio: 0 $ hasta 50 peticiones/mes; 11 $/mes hasta 1.000; 99 $/mes en el
  tramo de negocio.
- **Datos personales: no verificable.** La página de precios no menciona
  retención de datos, RGPD ni acuerdo de encargo de tratamiento, y no identifica
  siquiera el país de la empresa. Sin eso no se puede evaluar la condición 2, y
  no se puede firmar a ciegas enviándole la fecha y hora de nacimiento de
  clientes que pagan.
- Riesgo añadido: si el proveedor cierra o sube el precio, se lleva por delante
  el núcleo del producto.

El sector está lleno de estos servicios y sus comparativas están escritas por
ellos mismos. Ninguno de los que aparecen en las búsquedas es una empresa
identificable con trayectoria comprobable.

### C. Swiss Ephemeris en local (`sweph`)

- Máxima precisión posible, 0,001 segundos de arco.
- **Licencia: AGPL-3.0, o licencia profesional de pago.** La AGPL obligaría a
  publicar el código fuente de la app entera, porque se sirve por red. Para un
  producto cerrado no es viable.
- La profesional cuesta **CHF 750 una sola vez** (las fuentes discrepan entre
  700 y 750), válida 99 años. En coste puro sale mejor que la API en menos de un
  año — pero hoy, con la landing sin vender, es dinero adelantado por una
  precisión que no se ve.
- Es un módulo nativo de Node y necesita descargar aparte los ficheros de
  efemérides. En serverless eso es fricción real de despliegue.

## Recomendación

**Empezar por A.** Cuesta 0 €, satisface las dos condiciones —Placidus y datos,
esta última de la única forma que la satisface del todo, que es no enviarlos— y
da cartas reales de inmediato.

**C queda como camino de mejora**, no descartada: si algún día la precisión al
milisegundo de arco o el sello «Swiss Ephemeris» importan comercialmente, son
CHF 750 y un adaptador nuevo. Lo que hace barato ese cambio es haberlo puesto
detrás de `ChartProvider` desde el principio, que es justo lo que la decisión
original de «API externa primero» ya preveía.

**B se descarta** mientras no haya un proveedor que diga quién es y qué hace con
los datos.

## La trampa de la integración — confirmada al implementarla

`circular-natal-horoscope-js` **deriva la zona horaria por su cuenta** a partir
de latitud y longitud (`tz-lookup` + `moment-timezone`) y espera hora local, no
UTC. Nosotros ya resolvemos el instante con `resolveBirthInstant()`, que usa la
zona IANA que da GeoNames y los desfases históricos vía Luxon.

Dos fuentes de verdad para el dato del que depende el ascendente entero. Si
discrepan, la carta sale mal y en silencio.

La solución no es pelearse con la librería sino alimentarla en sus términos:
calcular la zona que ella misma usaría para esas coordenadas, expresar
**nuestro** instante UTC como hora local en esa zona, y pasarle eso. Convierte
de vuelta por el mismo camino y aterriza exactamente en el UTC que le dimos.
Después, el adaptador comprueba que `origin.utcTime` coincide con nuestro `utc`
y falla si no, en vez de devolver una carta desplazada.

Al implementarlo apareció que el riesgo era mayor de lo previsto, y de otro tipo.
No es solo que haya dos conversiones: es que **las dos bases de datos de zonas
horarias no coinciden**. Para Colombia en 1993, Luxon da por terminado el
horario de verano antes de las 03:30 UTC del 4 de abril y la copia que trae la
librería lo alarga hasta las 04:00. Misma hora local, un desfase distinto según
a quién se le pregunte. Está probado en `local.test.ts`, no es una conjetura.

El bucle de corrección lo absorbe sin enterarse, porque no razona sobre zonas:
ajusta la hora local hasta que el UTC de la librería es el nuestro, y le da
igual por qué difería.

### Lo que el bucle no puede arreglar

Cuando se vuelve del horario de verano, una hora local ocurre **dos veces**. La
librería solo sabe devolver una de las dos, así que la otra es inalcanzable por
mucho que se ajuste la entrada. En ese caso el adaptador **lanza**.

Es deliberado. Una hora de diferencia mueve el ascendente unos 15°, es decir un
signo entero, y el resultado no se distingue a simple vista de una carta
correcta. Devolver la vecina sería el peor de los dos errores.

Afecta a una hora por zona y por año, y solo a la mitad de los nacimientos de
esa hora. `resolveBirthInstant()` ya marca esos casos como
`ambiguity: 'repetida'`, así que se pueden detectar antes de intentar la carta.

**Pendiente**, si alguna vez molesta: `Origin` solo aporta `julianDate` y
`localSiderealTime`, que se pueden calcular desde nuestro UTC y sobrescribir.
Eso sacaría la zona horaria de la librería de la ecuación por completo y dejaría
una sola fuente de verdad. No se hizo ahora porque implica hacerse cargo del
cálculo del tiempo sidéreo, y fallar ahí sí sería silencioso.

## Cómo quedó

1. `circular-natal-horoscope-js` instalada. Añade tres dependencias
   (`moment`, `moment-timezone`, `tz-lookup`).
2. `src/lib/astrology/provider.ts` — contrato `ChartProvider`, con entrada en
   UTC ya resuelto.
3. `src/lib/astrology/local.ts` — el adaptador, marcado `server-only`.
4. `src/lib/astrology/local.test.ts` — 25 pruebas.

Los aspectos **no se toman de la librería**: se calculan con `separacion()` y
`ANGULO_ASPECTO`, que ya existían sin usar. Además de fijar los orbes de forma
explícita, evita que Sirio y Quirón —que la librería incluye entre sus cuerpos—
acaben dibujados en la rueda como si fueran planetas.

### Cómo se comprobó que las cartas son correctas

Que compile no dice nada sobre si el ascendente está bien. Las pruebas se apoyan
en hechos ajenos a la librería:

- **Equinoccios y solsticios de 2000.** En el equinoccio el Sol está en 0° Aries
  por definición, y en el solsticio en 0° Cáncer. Las tres fechas caen dentro de
  0,1°. Si las efemérides estuvieran mal cableadas, esto se rompe.
- **Invariantes de Placidus**: la primera cúspide es el ascendente y la décima
  el medio cielo; las cúspides opuestas distan 180°. Ciertos para cualquier
  carta, delatan una lectura cruzada de las casas.
- **Conservación del instante** en seis casos con zonas y desfases distintos.
- Que el orbe declarado de cada aspecto coincide con la separación real.

### La otra trampa: el paquete miente sobre cómo se importa

Su bundle marca `__esModule: true` pero **no define `default`**. Importándolo
por defecto, Vite hace un apaño y devuelve el espacio de nombres —así que las
pruebas unitarias pasaban— mientras que webpack respeta la marca y entrega
`undefined`. Solo reventaba en el build de producción, dentro de un `try` que lo
convertía en «no pudimos calcular tu carta».

Se importa **con nombres**. Lo cazaron las e2e, no las unitarias: es el tipo de
fallo para el que existe esa capa.

## Lo que sigue

Ya está cableado: la carta se calcula al terminar el onboarding, se guarda en
`portals.chart` y se dibuja en `/carta`. `CARTA_DE_EJEMPLO` se ha eliminado.

Con cartas de verdad, la capa de IA deja de estar bloqueada.

## Fuentes

- [Circular Natal Horoscope JS](https://github.com/0xStarcat/CircularNatalHoroscopeJS)
- [Swiss Ephemeris — información y licencias](https://www.astro.com/swisseph/swephinfo_e.htm)
- [Contrato de licencia profesional, edición junio 2026](http://www.astro.com/swisseph/secont_e.pdf)
- [sweph — bindings de Swiss Ephemeris para Node](https://github.com/timotejroiko/sweph)
- [Astrology API — precios](https://astrology-api.io/pricing)
