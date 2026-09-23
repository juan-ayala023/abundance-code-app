# Abundance Code — correcciones y mejoras para cierre semanal

Fecha: 23 de septiembre de 2026.

Documento para la IA o equipo de desarrollo. El objetivo es corregir y mejorar el portal actual, no rediseñarlo ni añadir módulos ajenos al alcance existente.

## Regla principal

Conservar:

- Diseño general.
- Menú y nombres actuales.
- Rutas existentes.
- Carta natal, lectura base, activación diaria, guía personalizada y cuenta.
- Estilo visual y paleta.

No añadir ahora:

- Alertas o notificaciones.
- WhatsApp o push.
- Tarot.
- Diario de señales.
- Rachas o gamificación.
- Nuevos niveles de suscripción.
- Cambios importantes de navegación.
- Animaciones complejas.

## Menú — no modificar

Mantener exactamente:

1. `Mi Portal`
2. `Lectura Base`
3. `Activación de Hoy`
4. `Guía Personalizada`
5. `Mi Cuenta`

La carta natal completa continúa accesible desde los enlaces que ya existen. No añadir otro elemento al menú.

## Prioridad 1 — corregir errores actuales

### Activación de Hoy

La página falla y muestra apartados vacíos. Corregir:

- Generación diaria.
- Reintento sin duplicar contenido.
- Estado visible mientras se prepara.
- Botón `Intentar de nuevo` cuando falle.
- Conservación del resultado aunque la persona recargue.
- Fecha correcta según la zona horaria definida.
- Nunca mostrar títulos vacíos como si fueran una lectura.

Texto de error:

> Tu lectura todavía no está lista. Puedes intentarlo nuevamente ahora. Si sales de esta página, seguiremos preparándola.

Botones: `Intentar de nuevo` y `Volver a mi portal`.

### Textos cortados

En Carta Natal hay secciones que terminan a mitad de palabra. Corregir la causa:

- No truncar por caracteres.
- Dar suficiente espacio a la generación.
- Validar que cada sección termine con frase y puntuación completas.
- Regenerar solo la sección incompleta.
- No publicar contenido cortado.
- Corregir «les demás» por «los demás» y mantener español neutro.

### Fecha del día

Durante la prueba, Activación de Hoy mostró 22 de septiembre cuando en Sídney ya era 23. Definir una sola regla de zona horaria y mostrarla. La fecha visible, los tránsitos y el contenido guardado deben corresponder al mismo día.

## Prioridad 2 — primera entrada y datos de nacimiento

### Formulario inicial

- Fecha y hora comienzan vacías.
- No colocar la fecha actual como nacimiento.
- Permitir escribir `DD/MM/AAAA`.
- Permitir cambiar rápidamente año y mes.
- Ciudad debe elegirse de la lista.
- Mostrar zona horaria detectada.
- `Continuar` permanece desactivado hasta completar datos válidos.
- Si no conoce la hora, debe marcarlo conscientemente.

### Confirmación antes de crear la carta

Mostrar:

> Vamos a crear tu carta con estos datos:
>
> **3 de julio de 1990 · 00:30 · Medellín, Colombia**
>
> Revisa que estén correctos. Después de crear tu carta, cualquier corrección deberá ser revisada por soporte.

Botones: `Confirmar y crear mi carta` y `Corregir un dato`.

### Pantalla de espera

El porcentaje actual se queda en 20% y después cambia de página. Si no existe progreso real, quitar el porcentaje.

Mostrar pasos sencillos:

1. `Calculando tu carta natal`.
2. `Interpretando tu carta`.
3. `Preparando tu lectura personal`.
4. `Tu portal está listo`.

Añadir: «Esto puede tardar alrededor de un minuto».

### Bienvenida

Al terminar:

> **Bienvenida a tu portal, Andrea.**
>
> Tu carta y tu lectura personal ya están listas.

Botón `Entrar a mi portal`. Sin frases adicionales ni animación larga.

## Prioridad 3 — orden de la lectura existente

En `Lectura Base`, organizar el contenido así:

1. Carta natal en tamaño equilibrado.
2. Explicación sencilla de las doce casas.
3. Lectura general de la carta.
4. Mundo emocional.
5. Abundancia y dinero.
6. Amor y vínculos.
7. Patrones repetidos.
8. Aprendizaje kármico.
9. Forma de decidir.
10. Fortalezas.
11. Siguiente paso.
12. Contexto astrológico técnico desplegable.

No hacer la carta gigante. No crear un bloque separado de Sol, Luna y Ascendente. No seleccionar solo cinco casas.

### Explicación de las casas

Mostrar las doce en acordeón o cuadrícula para evitar una página excesivamente larga.

Cada casa:

- Número y nombre cotidiano.
- Signo y planetas correspondientes, si existen.
- Dos o tres frases sencillas.
- Detalle técnico opcional.

## Prioridad 4 — mejorar Activación de Hoy sin cambiar el menú

Mantener el nombre `Activación de Hoy` y la ruta actual `/activacion`.

Dentro de esa página incluir dos opciones:

- `Mi lectura del mes`.
- `Mi lectura de hoy`.

No crear otra página principal ni modificar la navegación lateral.

### Mi lectura del mes

Es la lectura predictiva más completa, basada en los movimientos del mes sobre la carta natal de la persona.

Debe incluir:

1. El tema principal del mes.
2. Qué empieza a moverse.
3. Primera parte del mes.
4. Mitad del mes.
5. Final del mes.
6. Abundancia y dinero.
7. Amor y vínculos.
8. Trabajo y propósito.
9. Mundo emocional.
10. Días importantes.
11. Días favorables.
12. Días de cuidado.
13. Patrón kármico del mes.
14. Oportunidad principal.
15. Advertencia principal.
16. Tres acciones concretas.

Cada fecha debe explicar:

- Qué podría pasar.
- En qué área podría sentirse.
- Qué favorece.
- Qué conviene evitar.

Las fechas deben proceder de tránsitos reales. Si una influencia dura varios días, mostrar un rango.

### Mi lectura de hoy

Debe ser corta: 80–140 palabras.

Estructura:

1. Frase de intriga.
2. Qué podría pasar hoy.
3. Área donde podría sentirse.
4. Señal que conviene observar.
5. Qué evitar.
6. Acción breve.

Debe conectar con la lectura mensual y utilizar la carta completa, no únicamente el signo solar. Evitar repetir el mismo consejo durante varios días.

No afirmar engaños, llegada de dinero, regreso de personas o sucesos exactos sin sustento. La intriga debe ser emocional y específica, no alarmista.

### Cómo escribir el «morbo» de las predicciones

En este producto, «morbo» significa **intriga emocional personalizada**. La persona debe pensar:

- «¿Qué será lo que va a cambiar?»
- «Esto se parece a algo que estoy viviendo».
- «Quiero observar si aparece esa señal».
- «Necesito volver en esa fecha».

No significa asustar, inventar secretos ni asegurar acontecimientos. La tensión debe nacer de una posibilidad real interpretada desde sus tránsitos.

### Léxico de referencia — TikTok `@abundance.code8`

Referencia revisada: `https://www.tiktok.com/@abundance.code8`.

La IA debe tomar como referencia la voz que ya funciona en el TikTok de Abundance Code. En la revisión, las publicaciones visibles con mayor alcance superaban aproximadamente 90 mil vistas y compartían estas características:

- Empiezan directamente con `Lo que viene...`.
- Nombran una herida o patrón emocional reconocible.
- Introducen una verdad, conversación, corte, decisión o cambio de tono.
- Usan el karma como revelación o cierre del ciclo.
- Terminan con liberación, dignidad, reciprocidad, calma o un nuevo comienzo.
- Utilizan frases cortas y contrastes fuertes.
- Cierran con `Hecho está` cuando el tono lo permite.

Palabras y construcciones que forman parte de la voz:

- `Lo que viene...`
- `Una verdad sale a la luz`.
- `Algo empieza a mostrar grietas`.
- `Ya no puedes seguir sosteniendo...`.
- `Lo que parecía confusión se convierte en claridad`.
- `No te rompe: te ordena`.
- `No es castigo: es liberación`.
- `No es pérdida: es espacio para algo más real`.
- `El karma te muestra...`.
- `El karma te devuelve...`.
- `Se cae lo que no era recíproco`.
- `Lo que se va deja espacio...`.
- `Esta vez no te pierdes por...`.
- `Ya no necesitas demostrar tu valor`.
- `Lo que llega no te apaga: te acompaña`.
- `Hecho está`.

En el portal, no comenzar por el signo. Utilizar el nombre de la persona o hablarle directamente:

> **Andrea, lo que viene este mes toca una decisión que has evitado demasiado tiempo.**

La diferencia frente al TikTok es que el contenido del portal debe sustentarse en su carta completa y en tránsitos reales. Se conserva la intensidad del lenguaje, pero aumenta la precisión personal.

### Estructura emocional tomada del contenido que funciona

Usar esta secuencia:

1. **Identidad o herida:** qué ha estado sosteniendo, evitando, idealizando o repitiendo.
2. **Movimiento:** qué empieza a cambiar o qué verdad busca salir.
3. **Quiebre:** qué ya no puede continuar de la misma manera.
4. **Significado kármico:** qué ciclo está mostrando o corrigiendo.
5. **Liberación:** qué recupera la persona al comprenderlo.
6. **Nuevo horizonte:** qué tipo de experiencia puede abrirse después.
7. **Sello:** una frase corta que quede resonando.

Ejemplo adaptado al portal:

> Has estado intentando sostener la calma en una situación que todavía no te ofrece claridad. Este mes algo cambia de tono. Una conversación, una respuesta o incluso un silencio puede mostrarte cuánto estabas completando tú sola lo que la otra parte no definía. No viene a castigarte. Viene a devolverte una verdad: pedir reciprocidad no es exigir demasiado. Lo que se aclara ahora deja espacio para una decisión más limpia y más fiel a ti. **Hecho está.**

Este ejemplo marca el ritmo y la intensidad. La situación concreta debe cambiar según los tránsitos de cada persona; no copiar el mismo conflicto en todas las cartas.

#### Fórmula narrativa

Cada predicción debe combinar cinco elementos:

1. **Una tensión:** dos deseos o emociones que chocan.
2. **Una posibilidad:** qué situación podría aparecer.
3. **Un elemento no evidente:** lo importante no es lo primero que parece.
4. **Una señal concreta:** qué frase, comportamiento, repetición o sensación observar.
5. **Una salida:** cómo responder sin perder claridad.

Ejemplo de fórmula:

> Algo puede abrirse + pero trae una duda o tensión + lo importante está en un detalle que todavía no se ha dicho + observa esta señal + responde de esta manera.

#### Reglas de voz

- Hablar de `tú`.
- Empezar por la experiencia humana; explicar la astrología después.
- Usar frases breves y con ritmo.
- Ser directa, íntima y adulta; no infantil ni excesivamente mística.
- Usar `podrías`, `puede`, `es posible` o `todo indica` cuando se trate de una predicción.
- No llenar cada oración de dudas. Una advertencia de posibilidad es suficiente y luego el texto puede avanzar con seguridad.
- Mencionar una situación reconocible: conversación, propuesta, silencio, decisión, límite, gasto, reencuentro emocional, cansancio o necesidad de aprobación.
- No afirmar que esa situación ya existe si la persona no la ha contado.
- Terminar dejando claridad, no ansiedad.
- Mantener el dramatismo elegante del TikTok: intenso, breve y emocional, sin convertirse en amenaza.
- Usar contrastes: `no es X, es Y`; `no te quita, te devuelve`; `no te apaga, te revela`.
- Alternar frases cortas con un párrafo emocional; no escribir bloques uniformes.
- No suavizar tanto el texto que pierda la fuerza de la marca.

#### Frases de apertura que sí funcionan

- «Este mes algo que parecía detenido puede empezar a moverse, pero no de la forma que esperabas».
- «Una conversación aparentemente sencilla podría revelar quién está dispuesto a encontrarte a mitad de camino».
- «Lo que se abre este mes puede entusiasmarte y tocar, al mismo tiempo, una inseguridad que creías resuelta».
- «Una oportunidad puede llegar acompañada de una condición que no conviene ignorar».
- «Este periodo no viene a quitarte algo; viene a mostrarte qué ya no puedes seguir sosteniendo de la misma manera».
- «Hoy lo importante no será solo lo que alguien diga, sino lo que evite aclarar».
- «Algo pequeño puede cambiar el tono de una decisión que llevas días evitando».
- «Antes de responder, observa si estás eligiendo por deseo o por miedo a perder la oportunidad».

#### Frases prohibidas sin evidencia real

- «Tu pareja te está ocultando algo».
- «Alguien te traicionará».
- «Recibirás dinero inesperado».
- «Una persona del pasado regresará».
- «Esta es tu alma gemela».
- «Si no actúas hoy perderás la oportunidad».
- «El universo te está probando».
- «Esto ocurrirá a una hora exacta» si el cálculo no permite sostenerlo.

Estas frases pueden llamar la atención, pero son genéricas, manipuladoras y destruyen la credibilidad del producto.

### Escritura de la predicción mensual

La mensual debe sentirse como una historia con principio, tensión y desarrollo. No debe ser una lista plana de consejos.

#### Apertura mensual

Usar entre 100 y 150 palabras:

1. Qué empieza a cambiar.
2. Qué emoción podría provocar.
3. Dónde puede manifestarse.
4. Qué pregunta deja abierta.

Ejemplo:

> **Andrea, lo que viene este mes rompe una espera que ya empezaba a agotarte.**
>
> Algo vuelve a moverse y despierta una esperanza que no estaba completamente cerrada. Pero esta vez no bastarán las palabras. A medida que avance el mes, una respuesta, una condición o una ausencia de claridad puede obligarte a mirar lo que antes preferías justificar.
>
> El karma no te devuelve esta situación para que repitas el ciclo. Te la muestra para que compruebes si todavía estás dispuesta a dar más de lo que recibes. Lo que se defina ahora no viene a quitarte una oportunidad. Viene a devolverte poder sobre tu decisión. **Hecho está.**

#### Predicciones por área

Cada área debe contener:

- Una situación posible.
- La emoción o patrón que puede activar.
- Una señal observable.
- Una recomendación.

Ejemplo para abundancia:

> **Abundancia y dinero**
>
> Una propuesta o gasto puede parecer más urgente de lo que realmente es. Observa si la presión viene de una oportunidad concreta o del miedo a quedarte atrás. Si faltan cifras, fechas o responsabilidades claras, todavía no tienes toda la información. Este mes la abundancia no depende de decir sí más rápido, sino de reconocer qué acuerdo también protege tu energía.

#### Días importantes

Los títulos deben crear anticipación sin afirmar un hecho inevitable:

- `6–8 de octubre · Algo empieza a mostrar su verdadera intención`.
- `12–14 de octubre · Una decisión pide límites más claros`.
- `19–21 de octubre · Lo que estaba contenido busca una salida`.
- `27–29 de octubre · Una oportunidad cambia de forma`.

Formato:

> **12–14 de octubre · Una decisión pide límites más claros**
>
> Podría aparecer una conversación, propuesta o responsabilidad que te obligue a definir cuánto estás dispuesta a sostener. Lo importante no será responder de inmediato, sino notar si la otra parte también acepta condiciones.
>
> **Señal:** respuestas entusiastas pero poco concretas.
>
> **Favorece:** pedir fechas, cifras o un compromiso claro.
>
> **Cuidado con:** aceptar para evitar una incomodidad momentánea.

#### Días favorables

No escribir solamente «buen día para…». Explicar qué se facilita y cómo reconocerlo.

> **Día favorable · 18 de octubre**
>
> Una conversación puede fluir con más honestidad. Es buen momento para expresar algo que habías suavizado demasiado. La señal será sentir que puedes hablar sin tener que convencer.

#### Días de cuidado

No anunciar peligro. Explicar el riesgo emocional:

> **Día de cuidado · 23 de octubre**
>
> Podrías reaccionar más a la sensación de no ser escuchada que a lo que realmente está ocurriendo. Antes de cerrar una puerta, pregunta una vez más qué quiso decir la otra persona. El cuidado está en no convertir una duda en una conclusión.

### Escritura de la predicción diaria

La diaria debe ser más corta, inmediata y conectada con una fecha o tema de la mensual. No repetir toda la explicación astrológica.

#### Estructura de 80–140 palabras

1. Titular de intriga de una frase.
2. Situación posible en dos o tres frases.
3. `La señal`.
4. `Evita`.
5. `Activa`.

Ejemplo:

> **Andrea, hoy una respuesta incompleta puede decirte más que una promesa.**
>
> Una conversación o propuesta puede despertar entusiasmo, pero dejar un detalle sin resolver. No es una señal para huir. Es una señal para dejar de completar tú sola lo que la otra parte no define.
>
> **La señal:** palabras bonitas sin fecha, acción o compromiso concreto.
>
> **Evita:** ofrecer más para conseguir claridad.
>
> **Activa:** formula una pregunta directa y espera. Lo que responda —o lo que evite responder— puede cambiar tu percepción. **Hecho está.**

#### Versión débil y versión correcta

Débil:

> Hoy es un buen día para reflexionar y cuidar tu energía. Confía en ti y toma buenas decisiones.

Problema: puede pertenecerle a cualquier persona y no crea imagen, tensión ni curiosidad.

Correcta:

> Hoy podrías notar que alguien busca tu respuesta antes de ofrecerte toda la información. La urgencia puede hacerte querer decidir para recuperar tranquilidad. Espera. La señal estará en cómo reacciona cuando pidas un detalle concreto.

### Control de calidad antes de publicar

La IA debe comprobar:

1. ¿La predicción utiliza tránsitos realmente proporcionados?
2. ¿Podría este texto pertenecerle a cualquier signo o persona? Si sí, reescribir.
3. ¿Existe una tensión emocional concreta?
4. ¿Hay una señal observable?
5. ¿Se inventó una pareja, propuesta, traición, regreso o cantidad de dinero?
6. ¿La diaria se relaciona con la mensual?
7. ¿La mensual distingue inicio, mitad, final y fechas?
8. ¿El texto termina con claridad en lugar de miedo?
9. ¿Se repitió el mismo gancho de días anteriores?
10. ¿Todas las frases están completas y en español natural?
11. ¿El texto conserva el léxico emocional de Abundance Code o volvió a sonar como un consejo genérico?
12. ¿Existe al menos un contraste memorable: verdad/ilusión, carga/liberación, silencio/claridad o pérdida/espacio nuevo?

## Prioridad 5 — Guía Personalizada

Mejorar la función existente; no crear otra sección.

### Cantidad

Cambiar `3 consultas al día` por:

> **Te quedan 12 consultas este mes.**
>
> Cada consulta incluye tu pregunta inicial y dos preguntas para profundizar.

Cada consulta:

- Una pregunta principal.
- Una respuesta.
- Dos preguntas de seguimiento sobre el mismo tema.
- Historial guardado.

Una aclaración solicitada por el sistema no consume consulta. Releer tampoco consume.

### Flujo

1. La persona escribe su pregunta.
2. Si falta contexto, pedir una aclaración breve.
3. Responder con interpretación, patrón, qué observar y siguiente paso.
4. Mostrar `Puedes hacer 2 preguntas más sobre este tema`.
5. Guardar todo en el mismo hilo.

No precargar una pregunta sin que la persona la seleccione. Eliminar «el límite es igual para todas las cuentas, con o sin pago».

Las preguntas sugeridas pueden relacionarse con la lectura del mes, pero sin añadir notificaciones ni funciones adicionales.

## Prioridad 6 — Mi Cuenta

### Tarjetas

Unir `Estado del portal` y `Día actual`:

> **Portal activo · Día 1 de 30**
>
> `[barra de progreso]`
>
> Activado el 23 de septiembre de 2026

Mantener el resto del diseño. No es necesario rehacer toda la pantalla.

Actualizar el texto del plan para mencionar:

- Lectura base y carta natal.
- Lectura predictiva mensual.
- Lectura personal diaria.
- Doce consultas mensuales con seguimiento.

### Acceso posterior

No obligar a crear contraseña ahora.

- El primer enlace por correo activa la cuenta.
- Mantener sesión iniciada en el mismo dispositivo.
- Si cambia de dispositivo, cierra sesión o la sesión vence, enviar código de seis dígitos o enlace seguro.
- Añadir una explicación breve en Mi Cuenta: `Cómo volver a entrar`.
- No enviar un correo nuevo en cada visita mientras exista una sesión válida.

### Corrección de nacimiento

El nombre puede cambiarse directamente. Fecha, hora y lugar no se recalculan automáticamente.

Cambiar `Corregir mis datos` por `Solicitar una corrección`.

Formulario:

- Dato actual.
- Dato correcto.
- Motivo.
- Confirmación de que son sus propios datos.

Enviar a soporte. Solo después de aprobar se recalcula la carta. Mantener historial y consultas.

## Lenguaje y lectura fácil

- Mantener `Código Personal` como término de marca.
- Para instrucciones, usar `tu carta` y `tu lectura`.
- No alternar Código Personal y Código Natal.
- No llamar «app» al portal frente al cliente.
- Texto mínimo de 16 px.
- Párrafos cortos.
- Una idea por bloque.
- Explicar cualquier término astrológico.
- Botones claros con verbos.
- No mostrar secciones vacías.

La voz debe ser emocional, intrigante, clara y personal. Evitar textos empresariales o de productividad cuando no correspondan. No inventar acontecimientos privados.

## Manejo de errores

Para carta, lectura, mensual, diaria y guía:

- Estados: preparando, listo y error recuperable.
- Reintento sin duplicar.
- Conservar resultados ya guardados.
- No descontar consulta dos veces.
- Registrar el error técnico internamente.
- Mostrar lenguaje sencillo a la persona.

## Pruebas antes de cerrar

1. Compra y primer correo.
2. Onboarding con campos vacíos.
3. Selector de fecha fácil.
4. Confirmación de nacimiento.
5. Generación sin porcentaje congelado.
6. Bienvenida.
7. Carta, doce casas y lectura en el orden acordado.
8. Lectura mensual con fechas reales.
9. Lectura diaria corta y personalizada.
10. Activación recuperable después de error.
11. Consulta principal y dos seguimientos.
12. Historial sin consumo al releer.
13. Mi Cuenta con una sola tarjeta de estado.
14. Volver a entrar sin pedir correo cada vez.
15. Solicitud de corrección sin recalcular automáticamente.
16. Safari, Chrome y móvil.
17. Español e inglés completos, sin mezclar idiomas.
18. Cinco cartas diferentes para comprobar que las lecturas no son iguales.

## Criterios para aceptar el cierre

No considerar terminado hasta comprobar:

- Cero textos cortados.
- Cero apartados vacíos presentados como lectura.
- Fecha diaria correcta.
- Lectura mensual y diaria funcionando dentro de Activación de Hoy.
- Carta y casas organizadas.
- Consultas con seguimiento e historial.
- Cuenta simplificada.
- Acceso posterior comprensible.
- Cambios de nacimiento enviados a soporte.
- Flujo completo funcionando en móvil y escritorio.

## Orden de trabajo

1. Errores de activación, fecha y textos truncados.
2. Onboarding, confirmación y espera.
3. Orden de carta, casas y lectura.
4. Lectura mensual y diaria dentro de Activación de Hoy.
5. Guía Personalizada con seguimientos.
6. Mi Cuenta, acceso y corrección de nacimiento.
7. Pruebas completas y corrección de regresiones.

Antes de implementar, la IA debe indicar qué archivos modificará. Después debe entregar pruebas realizadas, capturas del resultado y cualquier incidencia que todavía exista. No borrar datos existentes.
