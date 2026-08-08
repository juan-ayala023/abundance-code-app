# Hallazgos de la app anterior (Lovable)

Extraído de capturas de `astro-ai-decoder.lovable.app`, el producto que se está
migrando. Recoge lo que **no aparece en CLAUDE.md** y afecta a decisiones ya
tomadas o por tomar.

## Discrepancias con CLAUDE.md

### Límite de consultas de la guía: 3/día, no 20

CLAUDE.md §8 propone «rate limit por usuario en `/api/guidance` (p.ej. 20/día)».
La app real dice literalmente **«3 consultas por día incluidas durante tu
período activo»**, y es una promesa hecha al usuario en pantalla.

Manda el producto. Pendiente de confirmar antes de implementarlo.

### El acceso no es binario: hay un ciclo de 30 días

La app muestra «Día 1 de 30» con barra de progreso, y en Mi Cuenta:

> Después de los primeros 30 días, tu Lectura Base permanecerá disponible. La
> Guía Personalizada y funciones avanzadas requieren una suscripción activa.

Es decir, **tres estados de acceso**, no dos:

1. Dentro de los 30 días: todo.
2. Pasados los 30 días sin suscripción: la lectura base sigue visible; la guía
   y las activaciones, no.
3. Con suscripción activa: todo.

`resolveAccess()` hoy solo distingue «tiene acceso» de «no lo tiene». Habrá que
modelar el ciclo. Necesita una fecha de inicio del portal, que hoy no se guarda.

### `activation_codes` es real y visible para el usuario

Mi Cuenta muestra **«Código activado: ACD4-····-····-B75C»** y una fecha de
activación. El sistema anterior no usaba solo un token en la URL: usaba códigos
de activación que el usuario conserva y ve.

CLAUDE.md los menciona de pasada (`access_tokens` LEGACY, `activation_codes` si
se migra el histórico). Son más centrales de lo que parecía: si se migran
usuarios, hay que traerlos.

### El email del usuario cambia entre sistemas

En la app anterior la cuenta es `ayalajuanjose93@gmail.com`; en la nueva se
entró con `juan_ayala82231@elpoli.edu.co`. Es exactamente el escenario de
CLAUDE.md §3.5 —el email de compra no coincide con el de Google— y confirma que
no es hipotético.

## Estructura de pantallas observada

| Ruta | Contenido |
|---|---|
| `/portal` | Saludo, «Día N de 30» con progreso, Tu Código Natal, Tu Patrón Central, Activación de Hoy, Guía Personalizada, «Áreas desbloqueadas» (5 iconos) |
| `/lectura-base` | Carta natal con «Descargar imagen», chips «EN ESTA LECTURA», «Resumen de tu Código Personal» y 7 secciones |
| `/activacion` | Mensaje principal, Qué observar hoy, Qué evitar, Qué activar, Pregunta de reflexión, «Marcar como leída» |
| `/guia` | Campo de pregunta, preguntas sugeridas, «Consultar mi guía», aviso de 3/día |
| `/cuenta` | Nombre, email, código activado, fecha de activación, estado del portal, día actual |
| `/generando` | 5 pasos con barra de progreso mientras se genera la lectura |

### Secciones de la lectura base

Tu energía principal · Tus patrones de abundancia · Tus bloqueos internos · Tu
forma de decidir · Tus señales personales · Tus fortalezas · Tu recomendación
inicial. Más un «Resumen de tu Código Personal» arriba y un «Leer análisis
completo» al final.

Esto fija el esquema de `portals.base_reading` y el prompt de la fase de IA.

### Descarga de la carta

Hay un botón **«Descargar imagen»** sobre la rueda. Refuerza la decisión de
CLAUDE.md §2 de dibujarla en SVG propio: exportar una imagen ajena no sería
posible.

## Sistema visual

Fondo crema cálido, tarjetas casi blancas con borde suave, acentos en dorado,
tipografía sans de peso ligero para titulares. Navegación lateral fija con
iconos en insignias circulares doradas. Motivo «✦» como viñeta. Logo: árbol de
la vida dentro de un anillo zodiacal.

## Aviso legal presente

> La Guía Personalizada está diseñada para reflexión personal y claridad
> interna. No reemplaza asesoría médica, legal, financiera o psicológica
> profesional.

Coincide con los guardrails de CLAUDE.md §8. Hay que conservarlo.
