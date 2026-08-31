import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  BookOpenCheck,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  FileVideo2,
  FolderCog,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import type { MediaAnalysis, Mp4FileInfo, ScanResult } from '../../shared/types'
import { formatBitRate, formatBytes, formatDate, formatDuration, formatFrameRate, formatSampleRate } from './format'

interface ToastState {
  tone: 'success' | 'error'
  text: string
}

export default function App(): React.JSX.Element {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [openingOutputFolder, setOpeningOutputFolder] = useState(false)
  const [choosingOutputFolder, setChoosingOutputFolder] = useState(false)
  const [deobfuscating, setDeobfuscating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [outputName, setOutputName] = useState('')
  const [outputFolder, setOutputFolder] = useState('Videos\\Cortos')
  const [toast, setToast] = useState<ToastState | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return (): void => {
      mounted.current = false
    }
  }, [])

  const scan = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const next = await window.inspector.scan()
      if (mounted.current) setResult(next)
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'No se pudo revisar CapCut')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void scan()
  }, [scan])

  useEffect(() => {
    void window.inspector
      .getOutputFolder()
      .then((path) => {
        if (mounted.current) setOutputFolder(path)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setOutputName('')
  }, [result?.file?.filePath])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3_000)
    return (): void => window.clearTimeout(timer)
  }, [toast])

  const reveal = async (file: Mp4FileInfo): Promise<void> => {
    setOpening(true)
    try {
      await window.inspector.reveal(file.filePath)
      setToast({ tone: 'success', text: 'Carpeta abierta y archivo seleccionado' })
    } catch (reason) {
      setToast({ tone: 'error', text: reason instanceof Error ? reason.message : 'No se pudo abrir la carpeta' })
    } finally {
      setOpening(false)
    }
  }

  const copyPath = async (file: Mp4FileInfo): Promise<void> => {
    try {
      await window.inspector.copyPath(file.filePath)
      setToast({ tone: 'success', text: 'Ruta copiada al portapapeles' })
    } catch (reason) {
      setToast({ tone: 'error', text: reason instanceof Error ? reason.message : 'No se pudo copiar la ruta' })
    }
  }

  const deobfuscate = async (file: Mp4FileInfo): Promise<void> => {
    setDeobfuscating(true)
    try {
      const action = await window.inspector.deobfuscate(file.filePath, outputName)
      setToast(
        action.status === 'completed'
          ? { tone: 'success', text: 'Video guardado en la carpeta de salida y seleccionado en Explorer' }
          : { tone: 'success', text: 'Desofuscacion cancelada; no se hicieron cambios' }
      )
    } catch (reason) {
      setToast({ tone: 'error', text: reason instanceof Error ? reason.message : 'No se pudo desofuscar el video' })
    } finally {
      setDeobfuscating(false)
    }
  }

  const openOutputFolder = async (): Promise<void> => {
    setOpeningOutputFolder(true)
    try {
      await window.inspector.openOutputFolder()
      setToast({ tone: 'success', text: 'Carpeta de salida abierta' })
    } catch (reason) {
      setToast({
        tone: 'error',
        text: reason instanceof Error ? reason.message : 'No se pudo abrir la carpeta de salida'
      })
    } finally {
      setOpeningOutputFolder(false)
    }
  }

  const chooseOutputFolder = async (): Promise<void> => {
    setChoosingOutputFolder(true)
    try {
      const action = await window.inspector.chooseOutputFolder()
      if (action.status === 'completed') {
        setOutputFolder(action.folderPath)
        setToast({ tone: 'success', text: 'Carpeta de salida actualizada' })
      }
    } catch (reason) {
      setToast({
        tone: 'error',
        text: reason instanceof Error ? reason.message : 'No se pudo cambiar la carpeta de salida'
      })
    } finally {
      setChoosingOutputFolder(false)
    }
  }

  const emptyFolder = async (file: Mp4FileInfo): Promise<void> => {
    setDeleting(true)
    try {
      const action = await window.inspector.emptyFolder(file.filePath)
      if (action.status === 'completed') {
        setToast({
          tone: 'success',
          text: `${action.removedCount ?? 0} elementos enviados a la Papelera`
        })
        await scan()
      } else {
        setToast({ tone: 'success', text: 'Eliminacion cancelada; no se movio ningun archivo' })
      }
    } catch (reason) {
      setToast({ tone: 'error', text: reason instanceof Error ? reason.message : 'No se pudo vaciar la carpeta' })
      await scan()
    } finally {
      setDeleting(false)
    }
  }

  const file = result?.file ?? null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <ScanSearch size={25} strokeWidth={1.7} />
          </span>
          <span>
            <strong>DESOFUSCADOR</strong>
            <small>VIDEOS</small>
          </span>
        </div>
        <div className="header-status">
          <ShieldCheck size={15} />
          <span>Acciones controladas</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">INSPECTOR LOCAL PARA WINDOWS</span>
            <h1>Encuentra el MP4 que genero CapCut</h1>
            <p>
              Detecta el archivo interno mas reciente, analiza su contenido y permite recuperar una copia reproducible.
            </p>
          </div>
          <button
            className="button button-secondary"
            disabled={loading || deobfuscating || deleting}
            onClick={() => void scan()}
          >
            <RefreshCw className={loading ? 'spinning' : ''} size={17} />
            {loading ? 'Buscando...' : 'Buscar de nuevo'}
          </button>
        </section>

        <section className="export-guide" aria-labelledby="export-guide-title">
          <div className="aside-heading">
            <span>
              <BookOpenCheck size={19} />
            </span>
            <div>
              <small>DESPUES DE EDITAR</small>
              <h2 id="export-guide-title">Guia rapida de exportacion</h2>
            </div>
          </div>
          <ol className="guide-list">
            <GuideStep number="1" title="Revisa el proyecto">
              Reproduce la linea de tiempo completa y confirma imagen, audio y duracion.
            </GuideStep>
            <GuideStep number="2" title="Pulsa Exportar">
              Esta arriba a la derecha. Elige el nombre y la carpeta de destino.
            </GuideStep>
            <GuideStep number="3" title="Configura el MP4">
              Usa MP4 con H.264 y conserva la resolucion y los FPS de tu material.
            </GuideStep>
            <GuideStep number="4" title="Espera al 100%">
              Al terminar, pulsa Abrir carpeta en CapCut para ver el archivo final.
            </GuideStep>
          </ol>
          <div className="guide-footer">
            <div className="guide-license-note">
              Si CapCut marca recursos Pro, reemplazalos por alternativas gratuitas o usa una licencia activa.
            </div>
            <a
              className="guide-link"
              href="https://www.capcut.com/help/export-videos-in-capcut"
              target="_blank"
              rel="noreferrer"
            >
              Guia oficial de CapCut
              <ExternalLink size={13} />
            </a>
          </div>
        </section>

        <section className="workspace" aria-live="polite">
          <div className="result-area">
            {loading && !result ? (
              <StatePanel
                icon={<RefreshCw className="spinning" size={29} />}
                title="Revisando las carpetas de CapCut"
                description="Buscando archivos MP4 en las ubicaciones internas conocidas."
              />
            ) : error ? (
              <StatePanel
                tone="error"
                icon={<CircleAlert size={29} />}
                title="No se pudo completar la busqueda"
                description={error}
                action={
                  <button className="button button-secondary" onClick={() => void scan()}>
                    Reintentar
                  </button>
                }
              />
            ) : file ? (
              <FileResult
                file={file}
                opening={opening}
                openingOutputFolder={openingOutputFolder}
                choosingOutputFolder={choosingOutputFolder}
                deobfuscating={deobfuscating}
                deleting={deleting}
                outputName={outputName}
                outputFolder={outputFolder}
                onOutputNameChange={setOutputName}
                onReveal={reveal}
                onCopy={copyPath}
                onOpenOutputFolder={openOutputFolder}
                onChooseOutputFolder={chooseOutputFolder}
                onDeobfuscate={deobfuscate}
                onEmptyFolder={emptyFolder}
              />
            ) : (
              <StatePanel
                icon={<FileVideo2 size={30} />}
                title="Todavia no aparece ningun MP4"
                description="No hay archivos internos detectables todavia. Consulta la guia para obtener el archivo final desde CapCut."
                action={
                  <button className="button button-secondary" onClick={() => void scan()}>
                    <RefreshCw size={16} />
                    Buscar de nuevo
                  </button>
                }
              />
            )}
          </div>

          <aside className="locations-panel">
            <div className="aside-heading">
              <span>
                <HardDrive size={19} />
              </span>
              <div>
                <small>ALCANCE DE BUSQUEDA</small>
                <h2>Carpetas revisadas</h2>
              </div>
            </div>
            <p>
              Se ignoran los videos auxiliares <code>*.alpha.mp4</code>. Las acciones se limitan al archivo detectado.
            </p>
            <div className="location-list">
              {(result?.locations ?? []).map((location) => (
                <div key={location.source}>
                  <span className={`location-icon ${location.available ? 'available' : ''}`}>
                    {location.available ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <span>
                    <strong>{location.label}</strong>
                    <small>{location.available ? 'Disponible' : 'No encontrada'}</small>
                  </span>
                </div>
              ))}
              {!result && (
                <div className="location-pending">Las ubicaciones apareceran cuando termine la busqueda.</div>
              )}
            </div>
            <div className="scope-note">
              <CircleAlert size={16} />
              <p>
                Desofuscar guarda la copia en la carpeta de salida configurada. Limpiar carpeta pide confirmacion y usa
                la Papelera; no cambia funciones de licencia.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <footer>
        <span>Desofuscador Videos</span>
        <span>No afiliado a CapCut o ByteDance.</span>
      </footer>
      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.tone === 'success' ? <Check size={17} /> : <CircleAlert size={17} />}
          <span>{toast.text}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function GuideStep({
  number,
  title,
  children
}: {
  number: string
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <li>
      <span className="guide-step-number">{number}</span>
      <p>
        <strong>{title}</strong>
        {children}
      </p>
    </li>
  )
}

function FileResult({
  file,
  opening,
  openingOutputFolder,
  choosingOutputFolder,
  deobfuscating,
  deleting,
  outputName,
  outputFolder,
  onOutputNameChange,
  onReveal,
  onCopy,
  onOpenOutputFolder,
  onChooseOutputFolder,
  onDeobfuscate,
  onEmptyFolder
}: {
  file: Mp4FileInfo
  opening: boolean
  openingOutputFolder: boolean
  choosingOutputFolder: boolean
  deobfuscating: boolean
  deleting: boolean
  outputName: string
  outputFolder: string
  onOutputNameChange: (value: string) => void
  onReveal: (file: Mp4FileInfo) => Promise<void>
  onCopy: (file: Mp4FileInfo) => Promise<void>
  onOpenOutputFolder: () => Promise<void>
  onChooseOutputFolder: () => Promise<void>
  onDeobfuscate: (file: Mp4FileInfo) => Promise<void>
  onEmptyFolder: (file: Mp4FileInfo) => Promise<void>
}): React.JSX.Element {
  const busy = opening || openingOutputFolder || choosingOutputFolder || deobfuscating || deleting
  return (
    <article className="file-card">
      <div className="file-heading">
        <span className="file-glyph">
          <FileVideo2 size={31} strokeWidth={1.6} />
        </span>
        <div>
          <span className="detected-label">
            <i /> ARCHIVO DETECTADO
          </span>
          <h2 data-testid="detected-file-name">{file.fileName}</h2>
        </div>
      </div>
      <dl className="metadata">
        <div>
          <dt>Origen</dt>
          <dd>{file.sourceLabel}</dd>
        </div>
        <div>
          <dt>Modificado</dt>
          <dd>{formatDate(file.modifiedAt)}</dd>
        </div>
        <div>
          <dt>Tamano</dt>
          <dd>{formatBytes(file.size)}</dd>
        </div>
      </dl>
      <MediaAnalysisPanel analysis={file.media} />
      <div className="path-box">
        <span>RUTA COMPLETA</span>
        <code title={file.filePath}>{file.filePath}</code>
      </div>
      <div className="output-settings">
        <label htmlFor="output-name">
          <span>NOMBRE DE SALIDA (OPCIONAL)</span>
          <input
            id="output-name"
            value={outputName}
            maxLength={180}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ej. corto-verano"
            onChange={(event) => onOutputNameChange(event.target.value)}
          />
          <small>Puede escribirse con o sin .mp4.</small>
        </label>
        <div className="output-destination">
          <span>CARPETA DE SALIDA</span>
          <div className="output-destination-row">
            <code title={outputFolder}>{outputFolder}</code>
            <button
              className="output-change-button"
              disabled={busy}
              title="Elegir otra carpeta de salida"
              onClick={() => void onChooseOutputFolder()}
            >
              {choosingOutputFolder ? <RefreshCw className="spinning" size={14} /> : <FolderCog size={14} />}
              {choosingOutputFolder ? 'Cambiando...' : 'Cambiar'}
            </button>
          </div>
        </div>
      </div>
      <div className="actions">
        <button
          className="button button-primary"
          disabled={busy}
          title="Abrir la carpeta del archivo detectado"
          onClick={() => void onReveal(file)}
        >
          <FolderOpen size={18} />
          {opening ? 'Abriendo...' : 'Abrir'}
        </button>
        <button
          className="button button-ghost"
          disabled={busy}
          title="Copiar la ruta completa"
          onClick={() => void onCopy(file)}
        >
          <Copy size={17} />
          Ruta
        </button>
        <button
          className="button button-ghost"
          disabled={busy}
          title="Abrir la carpeta de salida"
          onClick={() => void onOpenOutputFolder()}
        >
          <FolderOpen size={17} />
          {openingOutputFolder ? 'Abriendo...' : 'Abrir salida'}
        </button>
        <button className="button button-secondary" disabled={busy} onClick={() => void onDeobfuscate(file)}>
          {deobfuscating ? <RefreshCw className="spinning" size={17} /> : <Sparkles size={17} />}
          {deobfuscating ? 'Desofuscando...' : 'Desofuscar'}
        </button>
        <button
          className="button button-danger"
          disabled={busy}
          title="Enviar a la Papelera todo el contenido de la carpeta detectada"
          onClick={() => void onEmptyFolder(file)}
        >
          <Trash2 size={17} />
          {deleting ? 'Limpiando...' : 'Limpiar carpeta'}
        </button>
      </div>
    </article>
  )
}

function codecLabel(codecName: string): string {
  const labels: Record<string, string> = {
    h264: 'H.264 / AVC',
    hevc: 'H.265 / HEVC',
    av1: 'AV1',
    vp9: 'VP9',
    aac: 'AAC',
    opus: 'Opus',
    mp3: 'MP3'
  }
  return labels[codecName.toLowerCase()] ?? codecName.toUpperCase()
}

function valueOrDash(value: string | null): string {
  return value?.trim() || '—'
}

function MediaAnalysisPanel({ analysis }: { analysis: MediaAnalysis }): React.JSX.Element {
  const video = analysis.video
  const audio = analysis.audio
  const bitRate = video?.bitRate ?? analysis.bitRate
  const hasTechnicalData = analysis.status === 'ready' || analysis.status === 'protected'
  const statusLabel =
    analysis.status === 'ready'
      ? 'Analizado'
      : analysis.status === 'protected'
        ? 'Interno CapCut'
        : analysis.status === 'incomplete'
          ? 'Incompleto'
          : 'No disponible'

  return (
    <section className={`technical-panel technical-${analysis.status}`} aria-labelledby="technical-title">
      <div className="technical-heading">
        <span>
          <Activity size={17} />
        </span>
        <div>
          <small>LECTURA DEL ARCHIVO</small>
          <h3 id="technical-title">Analisis tecnico</h3>
        </div>
        <strong data-testid="media-analysis-status">{statusLabel}</strong>
      </div>

      {hasTechnicalData ? (
        <>
          {analysis.status === 'protected' ? (
            <div className="technical-message technical-note">
              <CircleAlert size={18} />
              <p>{analysis.detail}</p>
            </div>
          ) : null}
          <dl className="technical-grid">
            <TechnicalValue label="Codec de video" value={video ? codecLabel(video.codecName) : 'Sin pista'} />
            <TechnicalValue
              label="Perfil"
              value={video ? valueOrDash(video.profile) : '—'}
              title={video?.codecLongName ?? undefined}
            />
            <TechnicalValue
              label="Resolucion"
              value={video?.width && video.height ? `${video.width} x ${video.height}` : '—'}
            />
            <TechnicalValue label="Fotogramas" value={video?.frameRate ? formatFrameRate(video.frameRate) : '—'} />
            <TechnicalValue
              label="Duracion"
              value={analysis.durationSeconds !== null ? formatDuration(analysis.durationSeconds) : '—'}
            />
            <TechnicalValue label="Bitrate" value={bitRate !== null ? formatBitRate(bitRate) : '—'} />
            <TechnicalValue label="Formato de pixel" value={valueOrDash(video?.pixelFormat ?? null)} />
            <TechnicalValue label="Contenedor" value={valueOrDash(analysis.container)} />
            <TechnicalValue label="Codec de audio" value={audio ? codecLabel(audio.codecName) : 'Sin pista'} />
            <TechnicalValue
              label="Audio"
              value={
                audio
                  ? [
                      audio.sampleRate ? formatSampleRate(audio.sampleRate) : null,
                      audio.channelLayout ?? (audio.channels ? `${audio.channels} canales` : null)
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  : '—'
              }
              title={audio?.codecLongName ?? undefined}
            />
          </dl>
        </>
      ) : (
        <div className="technical-message">
          <CircleAlert size={18} />
          <p>{analysis.detail}</p>
        </div>
      )}
    </section>
  )
}

function TechnicalValue({
  label,
  value,
  title
}: {
  label: string
  value: string
  title?: string | undefined
}): React.JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  )
}

function StatePanel({
  icon,
  title,
  description,
  action,
  tone = 'neutral'
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  tone?: 'neutral' | 'error'
}): React.JSX.Element {
  return (
    <div className={`state-panel state-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="state-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}
