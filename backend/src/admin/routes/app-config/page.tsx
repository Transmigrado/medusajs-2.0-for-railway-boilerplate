import { defineRouteConfig } from '@medusajs/admin-sdk'
import { useEffect, useState } from 'react'

type AppConfig = {
  id: string
  dummy_value: string
  updated_at: string
}

// Minimal admin page for the app-config module pattern: reads/writes the single
// config row via /admin/app-config. Will grow into the real theme/menu/logo
// editor once the pattern is confirmed; kept dependency-free (no @medusajs/ui)
// since that's not a declared package.json dependency in this project.
const AppConfigPage = () => {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [dummyValue, setDummyValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/admin/app-config', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { app_config } = await res.json()
      setAppConfig(app_config)
      setDummyValue(app_config?.dummy_value ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/admin/app-config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dummy_value: dummyValue }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { app_config } = await res.json()
      setAppConfig(app_config)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>App Config</h1>
      <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 13 }}>
        Configuración de prueba consumida por la app mobile en GET /store/app-config.
      </p>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            dummy_value
          </label>
          <input
            value={dummyValue}
            onChange={(e) => setDummyValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '8px 16px',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {appConfig && (
            <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
              Última actualización: {new Date(appConfig.updated_at).toLocaleString()}
            </p>
          )}
        </>
      )}
      {error && <p style={{ color: '#dc2626', marginTop: 12, fontSize: 13 }}>{error}</p>}
    </div>
  )
}

export const config = defineRouteConfig({
  label: 'App Config',
})

export default AppConfigPage
