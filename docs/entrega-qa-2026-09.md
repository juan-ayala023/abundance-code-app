# Entrega · correcciones de la revisión del 13 de septiembre de 2026

Respuesta punto por punto al informe de revisión. Todo lo de aquí está en la
rama `correcciones-qa-2026-09`. Los ejemplos de la narrativa nueva, generados
con el modelo real y sin retocar, están en [ejemplos-narrativa.md](ejemplos-narrativa.md).

---

## 1 · Lo corregido

### Uso y experiencia

| Hallazgo del informe | Qué se hizo |
|---|---|
| La respuesta de la guía desaparecía al recargar | **Nunca se borró**: cada consulta se guardaba en base de datos desde el primer día, con pregunta, respuesta y fecha. Faltaba la pantalla. Ahora la guía tiene **«Mis consultas»**: se abren y se releen tras recargar y tras volver a entrar, y releer no gasta ninguna consulta. |
| ¿Las 3 consultas diarias son solo de cortesía? | Son **las mismas para todas las cuentas**, con o sin pago. Ahora la pantalla lo dice tal cual, y dice también que releer una respuesta guardada no cuenta. |
| El nombre comercial se usó como contexto e incluso firmando | Dos capas. **(a)** Al modelo solo le llega el nombre de pila, y solo si parece uno: «Inversiones AOA» ya no llega como nombre de nadie. **(b)** La voz le prohíbe deducir del nombre género, origen, profesión o empresa, y usarlo como firma o encabezado. |
| «¿Qué decisión estoy evitando?» inventó un proyecto y un socio | La voz exige **hipótesis, no certezas**, y prohíbe dar por hecho trabajo, pareja, socio, proyecto, empresa, ruptura o trauma que no estén en los datos ni en la pregunta. Si falta contexto, propone una hipótesis y pide el dato. El ejemplo 4 lo demuestra con esa misma pregunta y ese mismo perfil. |
| «Ver lectura completa» abría la carta y «Lectura Base» otra cosa | La tarjeta del portal ahora es **«Tu lectura personal → Leer mi lectura»** y abre la lectura. La carta se abre desde **«Ver mi carta natal completa»**, justo debajo de la rueda. Dos nombres, dos destinos. |
| Activación desde el menú compacto «no cambió de ruta» | Reproducido: el enlace funcionaba, pero la activación se escribe al abrirla (unos 13 s la primera vez del día) y no había ninguna señal de espera, así que el menú se quedaba abierto y parecía que no había pasado nada. Ahora la navegación responde al instante con un esqueleto de carga, en todas las pantallas del portal. |
| No se podían corregir los datos de nacimiento | Ahora sí, desde **Mi Cuenta → Corregir mis datos**. La pantalla explica antes de guardar qué pasa: si cambian fecha, hora o lugar, la carta se recalcula y la lectura y el retrato se vuelven a escribir; **las versiones anteriores se conservan** y se releen desde la lectura y la carta. Si solo cambia el nombre, no se reescribe nada. Las consultas de guía se conservan siempre. El enlace «revisar mis datos» de la carta, que antes rebotaba al portal, ahora lleva aquí. |
| El campo Plan mostraba un guion en cortesía | Ahora dice **«Acceso de cortesía»**, «Suscripción mensual», «Suscripción no activa» o «Sin plan», según el caso. |
| «Continuar con suscripción» llevaba a la oferta de 49 $ | Ese botón abre la página de precios de la landing, así que solo tiene sentido para quien **no** tiene acceso vigente. Ahora solo lo ve esa persona. Un suscriptor activo gestiona desde «Gestionar mi suscripción» (Stripe); una cortesía no ve ninguno de los dos. Ver decisiones pendientes. |
| «Descargar imagen» no se pudo confirmar | Dos fallos reales: el enlace de descarga no se insertaba en la página (Firefox y Safari lo ignoran) y la dirección temporal se anulaba antes de que la descarga arrancara. Corregidos, y ahora el botón confirma **«Descargada»** con el nombre del archivo. |
| Fecha visible y regla de huso en la activación | La activación muestra su **fecha** («lunes, 14 de septiembre de 2026») y dice la regla: **el día cambia a medianoche en hora universal (UTC)**, la misma que usa el contador de consultas. |
| Cambio de día | Al probarlo apareció un fallo más grave que no estaba en el informe: **a partir del día 31 se repetía la misma activación cada día**, porque el contador se detenía en 30. Un suscriptor que sigue pagando veía siempre la del día 30. Corregido. |
| Enlaces legales y contenido en móvil | Los tres documentos (privacidad, términos, reembolsos) responden con PDF desde la landing; verificado. El portal ya estaba maquetado para móvil; no se tocó. |

### Escritura e interfaz (§8)

- «Tu carta pesa en Agua» → **«El agua predomina en tu carta: la emoción, la intuición y la memoria pesan más en tu forma de estar»**, con una frase propia para cada elemento, también para el ausente.
- «El límite y la responsabilidad y tu imaginación rozan…» → **«Hoy podrías sentir tensión entre tus responsabilidades y lo que imaginas posible: algo pide un ajuste»**. Era un texto montado con tres trozos pegados; ahora es una frase entera por tipo de aspecto.
- «Cómo actúas y cómo peleas» → **«Cómo actúas y afrontas los conflictos»**.
- «Activación de hoy» duplicado en el portal: retirado.
- Fechas técnicas («1990-07-15») en la carta, la lectura y Mi Cuenta → escritas en el idioma de la interfaz («15 de julio de 1990»).
- «Leer análisis completo» → **«Ver el contexto astrológico»**, que es lo que ahora contiene: el detalle de colocaciones y aspectos sale de las secciones y va ahí.
- *Timing* y *feedback* no aparecen en la interfaz; ya no estaban.
- Frases que atan síntomas a planetas («Saturno en la 10 pesa en el pecho»): prohibidas en la voz del modelo. Las que existan en lecturas ya escritas no se tocan (ver §4).

### Narrativa nueva (§5)

La voz de los cuatro generadores (lectura, retrato, activación, guía) vive en un
solo archivo y se reescribió entera siguiendo el §5 del informe: apertura desde
una experiencia o pregunta concreta, una referencia astrológica por sección en
palabras corrientes, el patrón como hipótesis, cierre con una reflexión o
acción pequeña, estructura variable, párrafos de dos o tres frases, lo kármico
como lectura simbólica y nunca como deuda o castigo, sin urgencia, sin miedo,
sin promesas, sin tratar el desacuerdo como resistencia. Cada sección de la
lectura tiene además un encargo propio, para que no repitan impulso, control y
seguridad de principio a fin.

Extensiones: lectura 60–100 palabras por sección (los ejemplos salen entre 80 y
85), activación 150–220 en total (213), guía 120–200 (186 y 178).

Un fallo que apareció al generar los ejemplos y que **ya estaba en producción**:
las respuestas de la guía se cortaban a mitad de frase. El tope de salida
incluía los tokens de razonamiento del modelo y no dejaba sitio para escribir.
Corregido.

---

## 2 · Pruebas realizadas

- Comprobación de tipos, lint, 184 tests unitarios (7 nuevos: nombre de pila y reglas de la voz), verificación de acciones de servidor, build de producción, escaneo de secretos en el bundle y 22 tests de rutas protegidas: todo en verde.
- Generación real con el modelo de los cuatro ejemplos del §11, dos veces (la segunda tras corregir el corte de la guía).
- Enlaces legales: los tres PDF responden.
- **No se probó en navegador** el flujo completo de corregir datos de nacimiento con lecturas archivadas, ni la descarga en Safari/Firefox: exige un despliegue con la migración aplicada (§3). Es lo primero que hay que probar al publicar.

---

## 3 · Antes de publicar

1. **Aplicar la migración** `20260914120000_versiones_de_lectura.sql` en Supabase (`npx supabase db push`). Crea la tabla donde se conservan las lecturas retiradas. Sin ella la app no se rompe —si no puede archivar, no retira nada— pero corregir el nacimiento no reescribiría las lecturas.
2. Mezclar la rama en `main`: Railway despliega solo.
3. Probar en el dominio real: Mis consultas, corregir datos (primero solo el nombre, luego la hora), descarga, activación con su fecha.

---

## 4 · Lo que queda pendiente y no es de esta app

- **El pago no llegó al checkout en dos intentos.** El checkout lo abre la landing (`abundancecode.us/pricing`) contra su backend; esta app no participa hasta que Stripe devuelve al comprador con el token. Hay que reproducirlo con el equipo de la landing.
- **Renovación, importe de continuación, gestión y cancelación con cuenta pagada.** Los cobra y los gestiona Stripe a través del backend de la landing; esta app solo abre el portal de facturación. Necesita una compra real en modo de pruebas, que no se hizo.
- **Exactitud astronómica.** No se validó de forma independiente; el informe pide no darla por comprobada, y no se da.
- **Favoritos en la guía.** No se añaden: no están en la oferta.
- **Lecturas ya escritas con el tono anterior.** Se conservan tal cual. Si se decide regenerarlas con el tono nuevo, el mecanismo ya existe: la versión anterior se archiva como cuando se corrige el nacimiento, y se puede releer. Falta decidir **a quién** (¿a todos?, ¿solo a quien lo pida desde un botón?); es una decisión de producto y de coste (cada lectura base cuesta unos 8 centavos y tarda más de un minuto).

---

## 5 · Decisiones que necesitan respuesta

1. **¿Se regeneran las lecturas existentes con el tono nuevo?** Y si sí, ¿de oficio o a petición de cada persona? (§4, último punto.)
2. **La regla del cambio de día es medianoche UTC**, visible ahora en pantalla. Para alguien en Colombia eso son las 19:00; en Australia, las 10:00. Cambiarla a la hora local del lugar de nacimiento es posible, pero afecta a la vez a la activación, al contador de consultas y al «Día N de 30». No se cambió sin preguntar.
3. **«Continuar con suscripción» ya no aparece a quien tiene acceso.** Si se quería que un suscriptor activo pudiera «recomprar» desde ahí, hay que decirlo; el comportamiento anterior le ofrecía la oferta de entrada de 49 $.
4. **Ninguna condición de pago ni límite se cambió**, como pedía el informe: siguen siendo 3 consultas al día para todas las cuentas y 30 días de ciclo inicial.
