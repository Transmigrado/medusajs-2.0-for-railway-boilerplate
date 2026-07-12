import { useEffect, useRef, useState } from 'react'

type Media = { id: string; url: string; width: number; height: number }

type Props = {
  entityId: string
  apiBasePath: string
}

const MAX_DIMENSION = 400

// Shared upload widget for the "attach an image to a category/collection"
// pattern: uploads through Medusa's existing /admin/uploads (same as product
// images), then links the resulting url via our own /media route since module
// links don't get a write endpoint for free. Dimension cap is enforced
// client-side against the file before it's ever uploaded.
export const MediaWidget = ({ entityId, apiBasePath }: Props) => {
  const [media, setMedia] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const mediaUrl = `${apiBasePath}/${entityId}/media`

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(mediaUrl, { credentials: 'include' })
      const { media: current } = await res.json()
      setMedia(current)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId])

  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(objectUrl)
      }
      img.onerror = () => {
        reject(new Error('No se pudo leer la imagen'))
        URL.revokeObjectURL(objectUrl)
      }
      img.src = objectUrl
    })

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setBusy(true)
    try {
      const { width, height } = await readImageDimensions(file)
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        throw new Error(
          `La imagen es de ${width}x${height}px. El máximo permitido es ${MAX_DIMENSION}x${MAX_DIMENSION}px.`
        )
      }

      const formData = new FormData()
      formData.append('files', file)
      const uploadRes = await fetch('/admin/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error(`Error al subir el archivo (HTTP ${uploadRes.status})`)
      const { files } = await uploadRes.json()
      const url = files?.[0]?.url
      if (!url) throw new Error('El upload no devolvió una URL')

      const linkRes = await fetch(mediaUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, width, height }),
      })
      if (!linkRes.ok) {
        const body = await linkRes.json().catch(() => null)
        throw new Error(body?.message ?? `Error al guardar la imagen (HTTP ${linkRes.status})`)
      }
      const { media: newMedia } = await linkRes.json()
      setMedia(newMedia)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await fetch(mediaUrl, { method: 'DELETE', credentials: 'include' })
      setMedia(null)
    } catch {
      setError('Error al eliminar la imagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Imagen</h2>
      {loading ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>Cargando…</p>
      ) : (
        <>
          {media ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={media.url}
                alt=""
                style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, display: 'block', marginBottom: 8 }}
              />
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                {media.width}x{media.height}px
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Sin imagen</p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileSelected}
            disabled={busy}
            style={{ display: 'block', fontSize: 13, marginBottom: media ? 8 : 0 }}
          />

          {media && (
            <button
              onClick={remove}
              disabled={busy}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 6,
                fontSize: 13,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Eliminar imagen
            </button>
          )}
        </>
      )}
      {error && <p style={{ color: '#dc2626', marginTop: 10, fontSize: 12 }}>{error}</p>}
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
        Máximo {MAX_DIMENSION}x{MAX_DIMENSION}px.
      </p>
    </div>
  )
}
