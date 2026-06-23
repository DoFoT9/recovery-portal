'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Save, Upload, Trash2, Image as ImageIcon, Palette, Type, Info, RefreshCw,
} from 'lucide-react'
import { hexToRgbTriplet, isValidHex } from '@/lib/branding-client'

interface Branding {
  portal_name: string
  tagline: string
  brand_color: string
  brand_color_dark: string
  logo_filename: string | null
  favicon_filename: string | null
  footer_clinic_name: string | null
  footer_contact: string | null
  footer_abn: string | null
  footer_support_url: string | null
  email_from_name: string | null
  email_reply_to: string | null
}

export default function BrandingForm({ initial }: { initial: Branding }) {
  const router = useRouter()
  const [form, setForm] = useState<Branding>(initial)
  const [saving, setSaving] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
  const [faviconVersion, setFaviconVersion] = useState(0)
  const logoInput = useRef<HTMLInputElement>(null)
  const faviconInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = '__branding_preview'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = id
      document.head.appendChild(el)
    }
    const a = isValidHex(form.brand_color) ? hexToRgbTriplet(form.brand_color) : null
    const b = isValidHex(form.brand_color_dark) ? hexToRgbTriplet(form.brand_color_dark) : null
    if (a && b) {
      el.textContent = `:root{--brand-rgb:${a};--brand-dark-rgb:${b};}`
    } else {
      el.textContent = ''
    }
  }, [form.brand_color, form.brand_color_dark])

  function update<K extends keyof Branding>(key: K, value: Branding[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!form.portal_name.trim()) {
      toast.error('Portal name cannot be empty')
      return
    }
    if (!isValidHex(form.brand_color) || !isValidHex(form.brand_color_dark)) {
      toast.error('Colours must be valid hex like #2563eb')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      toast.success('Branding saved')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(file: File, kind: 'logo' | 'favicon') {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    const res = await fetch('/api/admin/branding/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Upload failed')
    }
    const data = await res.json()
    if (kind === 'logo') {
      update('logo_filename', data.filename)
      setLogoVersion(v => v + 1)
    } else {
      update('favicon_filename', data.filename)
      setFaviconVersion(v => v + 1)
    }
  }

  async function clearFile(kind: 'logo' | 'favicon') {
    if (!confirm(`Remove the current ${kind}?`)) return
    const res = await fetch('/api/admin/branding/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })
    if (res.ok) {
      if (kind === 'logo') {
        update('logo_filename', null)
        setLogoVersion(v => v + 1)
      } else {
        update('favicon_filename', null)
        setFaviconVersion(v => v + 1)
      }
      toast.success(`${kind === 'logo' ? 'Logo' : 'Favicon'} removed`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Type className="h-4 w-4 text-brand" /> Identity
        </h2>
        <div>
          <label className="text-xs text-neutral-500">Portal name</label>
          <input
            className="input mt-1"
            value={form.portal_name}
            onChange={e => update('portal_name', e.target.value)}
            placeholder="e.g. Northside Physio Recovery"
          />
          <p className="text-[11px] text-neutral-400 mt-1">
            Shown in the browser tab, login screen, and admin header.
          </p>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Login tagline</label>
          <input
            className="input mt-1"
            value={form.tagline}
            onChange={e => update('tagline', e.target.value)}
            placeholder="e.g. Your guided rehab programme, anytime."
          />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-brand" /> Logo &amp; favicon
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <FileSlot
            label="Logo"
            description="PNG, JPG, or SVG · max 5 MB · displayed on login + admin nav"
            currentSrc={form.logo_filename ? `/api/branding/logo?v=${logoVersion}` : null}
            previewBg="bg-neutral-100 dark:bg-neutral-900"
            previewSize="h-24"
            onPick={() => logoInput.current?.click()}
            onClear={() => clearFile('logo')}
            inputRef={logoInput}
            kind="logo"
            uploadFile={uploadFile}
          />
          <FileSlot
            label="Favicon"
            description="PNG or SVG recommended · square · shown in browser tab"
            currentSrc={form.favicon_filename ? `/api/branding/favicon?v=${faviconVersion}` : null}
            previewBg="bg-neutral-100 dark:bg-neutral-900"
            previewSize="h-24"
            onPick={() => faviconInput.current?.click()}
            onClear={() => clearFile('favicon')}
            inputRef={faviconInput}
            kind="favicon"
            uploadFile={uploadFile}
          />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-brand" /> Brand colours
        </h2>
        <p className="text-xs text-neutral-500">
          Default is a blue-collar palette (blue, black, white, grey). Pick two colours — primary is used for buttons and accents, the dark shade is the hover state.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorField
            label="Primary"
            hex={form.brand_color}
            onChange={v => update('brand_color', v)}
          />
          <ColorField
            label="Primary (hover/dark)"
            hex={form.brand_color_dark}
            onChange={v => update('brand_color_dark', v)}
          />
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50">
          <p className="text-[11px] text-neutral-500 mb-2 uppercase tracking-wide">Live preview</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary">Primary button</button>
            <button type="button" className="btn-secondary">Secondary</button>
            <span className="px-2 py-1 text-xs font-medium text-white bg-brand rounded">Badge</span>
            <span className="px-2 py-1 text-xs font-medium text-brand bg-brand/10 rounded border border-brand/30">Tint</span>
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1"
          onClick={() => {
            update('brand_color', '#2563eb')
            update('brand_color_dark', '#1d4ed8')
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Reset to default blue-collar theme
        </button>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-brand" /> Footer details
        </h2>
        <p className="text-xs text-neutral-500">
          Shown in the page footer across the app. Leave blank to hide.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Clinic / business name</label>
            <input
              className="input mt-1"
              value={form.footer_clinic_name || ''}
              onChange={e => update('footer_clinic_name', e.target.value)}
              placeholder="Northside Physiotherapy"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Contact line</label>
            <input
              className="input mt-1"
              value={form.footer_contact || ''}
              onChange={e => update('footer_contact', e.target.value)}
              placeholder="03 9000 0000 · hello@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">ABN / business number</label>
            <input
              className="input mt-1"
              value={form.footer_abn || ''}
              onChange={e => update('footer_abn', e.target.value)}
              placeholder="12 345 678 901"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Support URL</label>
            <input
              className="input mt-1"
              value={form.footer_support_url || ''}
              onChange={e => update('footer_support_url', e.target.value)}
              placeholder="https://yourclinic.com.au/support"
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4 opacity-90">
        <h2 className="font-semibold flex items-center gap-2">
          Email identity
          <span className="text-[10px] uppercase tracking-wide bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded px-1.5 py-0.5">
            saved for v7.3
          </span>
        </h2>
        <p className="text-xs text-neutral-500">
          These values are stored now so they&apos;re ready when email sending lands in v7.3.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Email &quot;From&quot; name</label>
            <input
              className="input mt-1"
              value={form.email_from_name || ''}
              onChange={e => update('email_from_name', e.target.value)}
              placeholder="Northside Recovery Portal"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Reply-to address</label>
            <input
              className="input mt-1"
              type="email"
              value={form.email_reply_to || ''}
              onChange={e => update('email_reply_to', e.target.value)}
              placeholder="hello@yourclinic.com.au"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 sticky bottom-2 z-10">
        <button
          className="btn-primary shadow-lg"
          onClick={save}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function ColorField({ label, hex, onChange }: { label: string; hex: string; onChange: (v: string) => void }) {
  const valid = isValidHex(hex)
  return (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <div className="flex gap-2 mt-1">
        <input
          type="color"
          value={valid ? hex : '#2563eb'}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          className={`input flex-1 font-mono ${valid ? '' : '!border-red-400'}`}
          value={hex}
          onChange={e => onChange(e.target.value)}
          placeholder="#2563eb"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

function FileSlot({
  label, description, currentSrc, previewBg, previewSize,
  onPick, onClear, inputRef, kind, uploadFile,
}: {
  label: string
  description: string
  currentSrc: string | null
  previewBg: string
  previewSize: string
  onPick: () => void
  onClear: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  kind: 'logo' | 'favicon'
  uploadFile: (file: File, kind: 'logo' | 'favicon') => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  return (
    <div className="space-y-2">
      <label className="text-xs text-neutral-500 font-medium">{label}</label>
      <div className={`flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 ${previewBg} ${previewSize}`}>
        {currentSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={`Current ${label}`}
            className="max-h-full max-w-[80%] object-contain"
          />
        ) : (
          <span className="text-xs text-neutral-400">No {label.toLowerCase()} set</span>
        )}
      </div>
      <p className="text-[11px] text-neutral-400">{description}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary !py-1.5 text-xs"
          onClick={onPick}
          disabled={uploading}
        >
          <Upload className="h-3 w-3" />
          {uploading ? 'Uploading…' : currentSrc ? 'Replace' : 'Upload'}
        </button>
        {currentSrc && (
          <button
            type="button"
            className="btn-secondary !py-1.5 text-xs text-red-600 dark:text-red-400"
            onClick={onClear}
            disabled={uploading}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (!file) return
          setUploading(true)
          try {
            await uploadFile(file, kind)
            toast.success(`${label} uploaded`)
          } catch (err: any) {
            toast.error(err.message || 'Upload failed')
          } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
          }
        }}
      />
    </div>
  )
}
