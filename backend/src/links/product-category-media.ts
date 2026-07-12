import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import MediaModule from '../modules/media'

export default defineLink(
  ProductModule.linkable.productCategory,
  MediaModule.linkable.media
)
