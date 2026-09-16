# Pendientes para el equipo de la landing · revisión del 13 de septiembre de 2026

> **Respondido el 14 de septiembre:** [respuesta-landing-2026-09-14.md](respuesta-landing-2026-09-14.md).
> En corto: el checkout fallaba por CORS con `www` (corregido); no hay modo de
> pruebas de Stripe, así que la compra real y el portal quedan sin ejecutar;
> renovación a 14,99 $/mes sin URL aparte; los PDF legales no eran los vigentes
> (la app enlaza ahora las páginas HTML); el backend ya no está en la cuenta
> impagada. Lo que cambió en la app a raíz de la respuesta está en
> [entrega-qa-2026-09.md](entrega-qa-2026-09.md), §4.

La app (`app.abundancecode.us`) no cobra ni conoce Stripe: canjea el token que
la landing le pasa en `/activar?token=…`, pregunta a su backend quién tiene
acceso y abre el portal de facturación que ese backend le devuelve. Todo lo de
esta lista pasa por la landing o por su backend, y por eso no se ha corregido
en la app.

## 1 · El pago no llega al checkout (bloqueante)

En la revisión del 13 de septiembre, **dos intentos de comprar desde
`abundancecode.us/pricing` no abrieron el checkout de Stripe**. La app no
participa hasta que Stripe devuelve al comprador con el token, así que el
fallo está antes: en el botón de la landing o en la llamada que crea la sesión
de checkout.

Hace falta: reproducirlo en modo de pruebas, con el navegador abierto en la
consola, y decir qué devuelve la petición que crea la sesión.

## 2 · Una compra completa en modo de pruebas

Nadie ha hecho una de punta a punta desde que la app cambió de cuenta de
Railway (8 de septiembre). Hay que comprobar:

- El checkout **cobra el importe configurado** y, al terminar, redirige a
  `https://app.abundancecode.us/activar?token=…` (dominio `.us`, no `.com`).
- `POST /api/access/redeem` responde con `hasAccess: true`, `status`, `plan`,
  `currentPeriodEnd` y el `email` del comprador. La app da acceso a la cuenta
  que inicia sesión con ese correo: si el correo de Stripe y el de Google no
  coinciden, la persona paga y no entra.
- `GET /api/access/status?email=…` sigue diciendo `hasAccess: true` al día
  siguiente (la app lo consulta para revalidar).

## 3 · Renovación e importe de continuación

- ¿Cuánto se cobra al renovar y **se informa antes de pagar**? La revisión vio
  la oferta de entrada de 49 $ y ninguna mención al importe siguiente.
- La app, a quien **no** tiene acceso vigente, le enseña un botón que abre
  `abundancecode.us/pricing`. Si existe un precio de continuación distinto de
  la oferta de entrada, hace falta **una URL de ese precio** para enlazarla; si
  no existe, decidlo y se deja como está.

## 4 · Gestionar y cancelar con una cuenta pagada

La app abre `POST /api/stripe/portal` con el correo y manda a la persona a la
URL que devuelve. Hace falta probar con una **suscripción de pruebas activa**
que el portal abre, que muestra la suscripción correcta y que cancelar deja
`hasAccess: false` en `/api/access/status` cuando termina el periodo (no
antes).

## 5 · Correspondencia entre landing y app

Que lo que promete la landing coincida con lo que hay:

- 30 días de guía activa; después, suscripción para seguir.
- 3 consultas de guía al día, **iguales para cualquier cuenta**, con o sin pago.
- Lectura base, retrato de la carta, activación diaria y guía. No hay favoritos.
- Los documentos legales (privacidad, términos, reembolsos) los sirve la
  landing como PDF; la app solo enlaza. Responden; revisad que el contenido
  sea el vigente.

## 6 · La cuenta de Railway con la suscripción impagada

El backend de la landing (`shimmering-curiosity`, con Postgres y Redis) sigue
en la cuenta de Railway `Jerónimo S b's Projects`, la que quedó con la
suscripción impagada. La app se movió a otra cuenta el 8 de septiembre; el
backend no. **Si Railway suspende esa cuenta, nadie nuevo puede entrar a la
app** (ni canjear tokens ni revalidar accesos). No es de nuestro equipo, pero
conviene resolverlo antes que cualquier otro punto de esta lista.

## Datos que la app necesita de vosotros

| Qué | Para qué |
|---|---|
| Resultado del intento de checkout en pruebas (qué devuelve la petición) | Punto 1 |
| Un token de prueba canjeable, o una compra de pruebas completa | Punto 2 |
| Importe de renovación y, si existe, URL del precio de continuación | Punto 3 |
| Correo de una suscripción de pruebas activa | Punto 4 |

## 7 · Nuevo, 15 de septiembre: botón «Regenerar lectura» en el panel

La lectura base y el retrato se escriben una vez y se guardan para siempre.
Cada vez que se ajuste la voz con la que se escriben, quien ya tenía lectura
sigue leyendo la vieja; pasó el 15 de septiembre con la revisión de Andrea. Para
no depender de un `update` a mano, la app expone:

```
POST https://app.abundancecode.us/api/admin/regenerar-lectura
Authorization: Bearer <APP_SHARED_SECRET>        (el mismo que /api/admin/usuarios)
Content-Type: application/json
{ "email": "persona@correo.com" }

200 { "archivadas": ["lectura", "retrato"] }   retirada; se reescribe en su próxima visita
404 { "message": "…" }                          sin cuenta, o sin datos de nacimiento
409 { "message": "…" }                          no había lectura que retirar
```

No genera nada en la petición (tardaría más de un minuto): archiva la lectura,
el retrato y la activación de hoy —la persona puede releer las versiones
anteriores desde la app— y la siguiente visita los escribe con la voz vigente.
En el panel bastaría un botón por usuario junto a los de `/api/admin/usuarios`,
con confirmación, y mostrar el `message` si no es 200.
