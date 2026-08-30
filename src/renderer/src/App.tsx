import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpenCheck,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  FileVideo2,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  X
} from 'lucide-react'
import type { Mp4FileInfo, ScanResult } from '../../shared/types'
import { formatBytes, formatDate } from './format'

interface ToastState {
  tone: 'success' | 'error'
  text: string
}

export default function App(): React.JSX.Element {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
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

  const file = result?.file ?? null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <ScanSearch size={25} strokeWidth={1.7} />
          </span>
          <span>
            <strong>CLIP CACHE</strong>
            <small>MP4 INSPECTOR</small>
          </span>
        </div>
        <div className="header-status">
          <ShieldCheck size={15} />
          <span>Solo lectura</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">INSPECTOR LOCAL PARA WINDOWS</span>
            <h1>Encuentra el MP4 que genero CapCut</h1>
            <p>
              Detecta el archivo interno mas reciente, muestra su nombre y abre exactamente la carpeta que lo contiene.
            </p>
          </div>
          <button className="button button-secondary" disabled={loading} onClick={() => void scan()}>
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
              <FileResult file={file} opening={opening} onReveal={reveal} onCopy={copyPath} />
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
              Se ignoran los videos auxiliares <code>*.alpha.mp4</code>. Ningun proyecto se modifica.
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
              <p>Esta aplicacion no exporta videos, no ejecuta CapCut y no cambia funciones de licencia.</p>
            </div>
          </aside>
        </section>
      </main>

      <footer>
        <span>Clip Cache Inspector</span>
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
  onReveal,
  onCopy
}: {
  file: Mp4FileInfo
  opening: boolean
  onReveal: (file: Mp4FileInfo) => Promise<void>
  onCopy: (file: Mp4FileInfo) => Promise<void>
}): React.JSX.Element {
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
      <div className="path-box">
        <span>RUTA COMPLETA</span>
        <code title={file.filePath}>{file.filePath}</code>
      </div>
      <div className="actions">
        <button className="button button-primary" disabled={opening} onClick={() => void onReveal(file)}>
          <FolderOpen size={18} />
          {opening ? 'Abriendo...' : 'Abrir carpeta'}
        </button>
        <button className="button button-ghost" onClick={() => void onCopy(file)}>
          <Copy size={17} />
          Copiar ruta
        </button>
      </div>
    </article>
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
