import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { MediaWidget } from '../components/media-widget'

const ProductCollectionMediaWidget = ({ data }: { data: { id: string } }) => {
  return <MediaWidget entityId={data.id} apiBasePath="/admin/collections" />
}

export const config = defineWidgetConfig({
  zone: 'product_collection.details.after',
})

export default ProductCollectionMediaWidget
