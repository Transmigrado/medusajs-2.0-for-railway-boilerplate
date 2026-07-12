import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MEDIA_MODULE } from '../modules/media'
import type MediaModuleService from '../modules/media/service'

const MAX_DIMENSION = 400

type MediaEntityLinkConfig = {
  entity: string
  entityIdField: string
  moduleKey: string
}

// GET/POST/DELETE for the single Media row 1-1 linked to a product_category or
// product_collection row (see src/links). Reads go through the linked field on
// the core routes just fine (?fields=media.url) — this only covers writes,
// which module links don't get for free.
export function createMediaLinkHandlers({ entity, entityIdField, moduleKey }: MediaEntityLinkConfig) {
  const getLinkedMediaId = async (req: MedusaRequest): Promise<string | undefined> => {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity,
      fields: ['id', 'media.id', 'media.url', 'media.width', 'media.height'],
      filters: { id: req.params.id },
    })
    return data[0]?.media?.id as string | undefined
  }

  const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity,
      fields: ['id', 'media.id', 'media.url', 'media.width', 'media.height'],
      filters: { id: req.params.id },
    })
    res.status(200).json({ media: data[0]?.media ?? null })
  }

  const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const { url, width, height } = req.body as { url: string; width: number; height: number }
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      res.status(400).json({
        message: `La imagen no puede superar ${MAX_DIMENSION}x${MAX_DIMENSION}px (recibido ${width}x${height}).`,
      })
      return
    }

    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
    const mediaModuleService: MediaModuleService = req.scope.resolve(MEDIA_MODULE)

    const existingMediaId = await getLinkedMediaId(req)
    if (existingMediaId) {
      await link.dismiss([
        { [moduleKey]: { [entityIdField]: req.params.id }, [MEDIA_MODULE]: { media_id: existingMediaId } },
      ])
      await mediaModuleService.deleteMedia([existingMediaId])
    }

    const media = await mediaModuleService.createMedia({ url, width, height })
    await link.create([
      { [moduleKey]: { [entityIdField]: req.params.id }, [MEDIA_MODULE]: { media_id: media.id } },
    ])

    res.status(200).json({ media })
  }

  const DELETE = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
    const mediaModuleService: MediaModuleService = req.scope.resolve(MEDIA_MODULE)

    const existingMediaId = await getLinkedMediaId(req)
    if (existingMediaId) {
      await link.dismiss([
        { [moduleKey]: { [entityIdField]: req.params.id }, [MEDIA_MODULE]: { media_id: existingMediaId } },
      ])
      await mediaModuleService.deleteMedia([existingMediaId])
    }

    res.status(200).json({ media: null })
  }

  return { GET, POST, DELETE }
}
