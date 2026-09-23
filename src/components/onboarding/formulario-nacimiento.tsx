'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { guardarDatosNacimiento } from '@/app/(app)/onboarding/actions'
import { ESTADO_INICIAL } from '@/app/(app)/onboarding/estado'
import type { Place } from '@/lib/geo/types'

import { BuscadorCiudades } from './buscador-ciudades'

/** Lo que hay guardado, para el modo de corrección. Ver `onboarding/page.tsx`. */
export type ValoresIniciales = {
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  lugar: Place | null
}

/**
 * Los datos de nacimiento.
 *
 * La fecha va en tres campos —día, mes y año— y no en un `<input type="date">`.
 * El selector nativo obliga a navegar mes a mes hasta 1990, y en la revisión
 * del 23 de septiembre se señaló como el paso más incómodo del alta. Con tres
 * campos se escribe de corrido y el año se cambia de un tirón.
 *
 * El formulario tiene dos pasos: escribir y **confirmar**. La confirmación no
 * es una formalidad: al guardar se calcula la carta y todo lo que se escriba
 * después cuelga de ella, así que corregir más tarde pasa por soporte. Verlo
 * una vez, escrito en claro, evita la mayoría de esas correcciones.
 */
export function FormularioNacimiento({
  nombreInicial,
  editando = false,
  valoresIniciales,
}: {
  nombreInicial: string
  /** Modo corrección: cambia el texto del botón. La acción es la misma. */
  editando?: boolean
  valoresIniciales?: ValoresIniciales
}) {
  const t = useTranslations('onboarding')
  const [estado, accion] = useActionState(guardarDatosNacimiento, ESTADO_INICIAL)

  const [nombre, setNombre] = useState(nombreInicial)
  const [dia, setDia] = useState(valoresIniciales?.birthDate?.slice(8, 10) ?? '')
  const [mes, setMes] = useState(valoresIniciales?.birthDate?.slice(5, 7) ?? '')
  const [anio, setAnio] = useState(valoresIniciales?.birthDate?.slice(0, 4) ?? '')
  const [hora, setHora] = useState(valoresIniciales?.birthTime ?? '')
  const [horaDesconocida, setHoraDesconocida] = useState(valoresIniciales?.timeUnknown ?? false)
  const [lugar, setLugar] = useState<Place | null>(valoresIniciales?.lugar ?? null)
  const [confirmando, setConfirmando] = useState(false)

  const fecha = useMemo(() => componerFecha(dia, mes, anio), [dia, mes, anio])

  /* «Continuar» no se enciende hasta que hay datos que valen. Un botón activo
     que luego rechaza el formulario enseña el error después del esfuerzo. */
  const completo =
    nombre.trim().length > 1 &&
    fecha !== null &&
    lugar !== null &&
    (horaDesconocida || /^\d{2}:\d{2}$/.test(hora))

  const MESES = t.raw('meses') as string[]

  return (
    <form action={accion} className="flex flex-col gap-6">
      {/* La acción distingue corregir de estrenar: solo en el primer caso archiva lecturas. */}
      {editando ? <input type="hidden" name="editando" value="1" /> : null}
      <input type="hidden" name="birthDate" value={fecha ?? ''} />

      {confirmando ? (
        <>
          {/*
            Los campos dejan de estar en pantalla, pero tienen que seguir en el
            formulario: sin esto el envío llegaba sin nombre, sin hora y sin
            lugar, y la acción lo rechazaba sin que se viera por qué. Lo cazó
            la prueba e2e del alta completa.
          */}
          <input type="hidden" name="fullName" value={nombre} />
          <input type="hidden" name="birthTime" value={horaDesconocida ? '' : hora} />
          {horaDesconocida ? <input type="hidden" name="timeUnknown" value="on" /> : null}
          <input type="hidden" name="place" value={lugar ? JSON.stringify(lugar) : ''} />
        </>
      ) : null}

      {confirmando ? (
        <Confirmacion
          nombre={nombre}
          fecha={fecha!}
          hora={horaDesconocida ? null : hora}
          lugar={lugar!}
          editando={editando}
          onCorregir={() => setConfirmando(false)}
        />
      ) : (
        <>
          <Campo id="fullName" etiqueta={t('nombre')} error={estado.campos.fullName}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              className="rounded-xl border border-borde bg-superficie px-4 py-3"
            />
          </Campo>

          <Campo id="birthDay" etiqueta={t('fecha')} error={estado.campos.birthDate}>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] gap-2">
              <input
                id="birthDay"
                inputMode="numeric"
                maxLength={2}
                placeholder={t('dia')}
                aria-label={t('dia')}
                value={dia}
                onChange={(e) => setDia(soloDigitos(e.target.value, 2))}
                className="rounded-xl border border-borde bg-superficie px-4 py-3 text-center"
              />
              <select
                aria-label={t('mes')}
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded-xl border border-borde bg-superficie px-3 py-3"
              >
                <option value="">{t('mes')}</option>
                {MESES.map((nombreMes, i) => (
                  <option key={nombreMes} value={String(i + 1).padStart(2, '0')}>
                    {nombreMes}
                  </option>
                ))}
              </select>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder={t('anio')}
                aria-label={t('anio')}
                value={anio}
                onChange={(e) => setAnio(soloDigitos(e.target.value, 4))}
                className="rounded-xl border border-borde bg-superficie px-4 py-3 text-center"
              />
            </div>
            {dia && mes && anio && !fecha ? (
              <p role="alert" className="text-sm text-[#a8503c]">
                {t('fechaNoValida')}
              </p>
            ) : null}
          </Campo>

          <Campo id="birthTime" etiqueta={t('hora')} error={estado.campos.birthTime}>
            <input
              id="birthTime"
              name="birthTime"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              disabled={horaDesconocida}
              className="rounded-xl border border-borde bg-superficie px-4 py-3 disabled:opacity-50"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                name="timeUnknown"
                type="checkbox"
                checked={horaDesconocida}
                onChange={(event) => setHoraDesconocida(event.target.checked)}
              />
              {t('horaDesconocida')}
            </label>

            {horaDesconocida ? (
              <p className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm">
                {t.rich('avisoSinHora', { b: (trozo) => <strong>{trozo}</strong> })}
              </p>
            ) : null}
          </Campo>

          <BuscadorCiudades
            onSelect={setLugar}
            inicial={valoresIniciales?.lugar ?? null}
            error={estado.campos.place}
          />

          {estado.error ? (
            <p
              role="alert"
              className="rounded-2xl border border-[#e0b3a8] bg-[#f6e6e1] px-4 py-3 text-sm"
            >
              {estado.error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!completo}
            onClick={() => setConfirmando(true)}
            className="rounded-xl bg-oro px-5 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('continuar')}
          </button>
        </>
      )}
    </form>
  )
}

/** Lo que se va a crear, en claro, antes de crearlo. */
function Confirmacion({
  nombre,
  fecha,
  hora,
  lugar,
  editando,
  onCorregir,
}: {
  nombre: string
  fecha: string
  hora: string | null
  lugar: Place
  editando: boolean
  onCorregir: () => void
}) {
  const t = useTranslations('onboarding')
  const MESES = t.raw('meses') as string[]
  const [anio, mes, dia] = fecha.split('-')

  const linea = [
    `${Number(dia)} de ${MESES[Number(mes) - 1]?.toLowerCase()} de ${anio}`,
    hora ?? t('horaDesconocidaCorto'),
    `${lugar.city}${lugar.country ? `, ${lugar.country}` : ''}`,
  ].join(' · ')

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-oro-claro bg-oro-palido/50 px-5 py-5">
        <p className="text-sm">{t('confirmar.titulo', { nombre })}</p>
        <p className="text-lg font-medium leading-snug">{linea}</p>
        <p className="text-sm leading-relaxed opacity-80">{t('confirmar.aviso')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <BotonGuardar editando={editando} />
        <button
          type="button"
          onClick={onCorregir}
          className="rounded-xl border border-oro-claro px-5 py-3 font-medium transition-colors hover:bg-oro-palido/60"
        >
          {t('confirmar.corregir')}
        </button>
      </div>
    </section>
  )
}

function BotonGuardar({ editando }: { editando: boolean }) {
  const t = useTranslations('onboarding')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-oro px-5 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
    >
      {pending ? t('guardando') : editando ? t('editar.guardar') : t('confirmar.crear')}
    </button>
  )
}

function soloDigitos(valor: string, maximo: number): string {
  return valor.replace(/\D/g, '').slice(0, maximo)
}

/**
 * `AAAA-MM-DD` si los tres campos forman una fecha real, y `null` si no.
 *
 * Comprueba que el día exista en ese mes —un 31 de febrero se descarta aquí y
 * no al enviar— y que el año sea plausible para un nacimiento.
 */
function componerFecha(dia: string, mes: string, anio: string): string | null {
  if (dia.length === 0 || mes.length === 0 || anio.length !== 4) return null

  const d = Number(dia)
  const m = Number(mes)
  const a = Number(anio)
  if (!d || !m || !a) return null
  if (a < 1900 || a > new Date().getFullYear()) return null

  const fecha = new Date(Date.UTC(a, m - 1, d))
  if (fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null
  if (fecha.getTime() > Date.now()) return null

  return `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Etiqueta y campo, asociados de verdad.
 *
 * El `htmlFor` no es decorativo: sin él, un lector de pantalla anuncia un
 * campo sin nombre y pulsar sobre el texto no enfoca el input.
 */
function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string
  etiqueta: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
