import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { setProject, type App } from '@/lib/client'
import { PROJECTS } from '@/lib/common'

/** A gradient disc derived from a string, as wallets show for accounts. */
export function Avatar({ seed, size = 32 }: { seed: string; size?: number }) {
  let x = 2166136261
  for (const c of String(seed).toLowerCase()) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0
  const a = x % 360
  const b = (a + 60 + ((x >>> 12) % 120)) % 360
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, hsl(${a} 90% 72%), hsl(${b} 70% 45%))`
      }}
    />
  )
}

export function AppIcon({
  src,
  size = 40,
  name = '?'
}: {
  src?: string
  size?: number
  name?: string
}) {
  if (!src)
    return (
      <span className="app-icon placeholder" style={{ width: size, height: size }}>
        {(name || '?')[0]}
      </span>
    )
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="app-icon" src={src} width={size} height={size} alt="" />
}

/** A modal: a centered dialog on wide screens, a bottom sheet on narrow ones. */
export function Sheet({
  open,
  onClose,
  children
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 220)
    return () => clearTimeout(t)
  }, [open])
  if (!mounted) return null
  return (
    <div
      className={`overlay ${shown ? 'open' : ''}`}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div className="sheet" role="dialog">
        {children}
      </div>
    </div>
  )
}

export function SheetHead({
  title,
  onClose,
  aside
}: {
  title: string
  onClose?: () => void
  aside?: ReactNode
}) {
  return (
    <div className="sheet-head">
      <h3>{title}</h3>
      {aside ??
        (onClose && (
          <button className="close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        ))}
    </div>
  )
}

// ------------------------------------------------------------ toasts

type ToastKind = 'info' | 'ok' | 'warn'
const toastListeners = new Set<(text: string, kind: ToastKind) => void>()
export const toast = (text: string, kind: ToastKind = 'info') =>
  toastListeners.forEach(l => l(text, kind))

export function Toaster() {
  const [items, setItems] = useState<
    { id: number; text: string; kind: ToastKind; show: boolean }[]
  >([])
  useEffect(() => {
    const show = (text: string, kind: ToastKind) => {
      const id = Date.now() + Math.random()
      const patch = (s: boolean) =>
        setItems(xs => xs.map(t => (t.id === id ? { ...t, show: s } : t)))
      setItems(xs => [...xs, { id, text, kind, show: false }])
      requestAnimationFrame(() => patch(true))
      setTimeout(() => patch(false), 4200)
      setTimeout(() => setItems(xs => xs.filter(t => t.id !== id)), 4450)
    }
    toastListeners.add(show)
    return () => {
      toastListeners.delete(show)
    }
  }, [])
  return (
    <div id="toasts">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.kind} ${t.show ? 'show' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast('Copied')
}

// ------------------------------------------------------------ developer log

export interface LogEntry {
  id: number
  time: string
  kind: string
  body: string
}
let logId = 0

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const log = useCallback((kind: string, data?: unknown) => {
    const body =
      data === undefined ? '' : typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const entry = { id: ++logId, time: new Date().toLocaleTimeString(), kind, body }
    setEntries(xs => [entry, ...xs].slice(0, 300))
  }, [])
  return { entries, log }
}

export function DevLog({ entries, narrow }: { entries: LogEntry[]; narrow?: boolean }) {
  return (
    <details className="devlog" style={narrow ? { maxWidth: 460 } : undefined}>
      <summary>
        Developer log · <span id="logcount">{entries.length}</span> events
      </summary>
      <div className="card">
        <div id="log" className="log">
          {entries.map(e => (
            <div key={e.id} className="log-line">
              <span className="log-time">{e.time}</span>
              <span className={`log-kind ${e.kind}`}>{e.kind}</span>
              {e.body && <pre>{e.body}</pre>}
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

/** Switches this app's projectId; the page reloads with it. */
export function ProjectPicker({ app, projectId }: { app: App; projectId: string }) {
  return (
    <label className="chip select-chip" title={`projectId ${projectId}`}>
      <span className="chip-dot" />
      <select
        aria-label="Project"
        value={projectId}
        onChange={e => setProject(app, e.target.value)}
      >
        {PROJECTS.map(o => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Re-renders every `ms` while `active`, for countdowns. */
export function useNow(active: boolean, ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [active, ms])
  return now
}
