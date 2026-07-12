import { Modules } from '@medusajs/framework/utils'
import { createMediaLinkHandlers } from '../../../../../utils/media-entity-link'

export const { GET, POST, DELETE } = createMediaLinkHandlers({
  entity: 'product_category',
  entityIdField: 'product_category_id',
  moduleKey: Modules.PRODUCT,
})
