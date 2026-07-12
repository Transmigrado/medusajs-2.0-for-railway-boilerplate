import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { MediaWidget } from '../components/media-widget'

const ProductCategoryMediaWidget = ({ data }: { data: { id: string } }) => {
  return <MediaWidget entityId={data.id} apiBasePath="/admin/product-categories" />
}

export const config = defineWidgetConfig({
  zone: 'product_category.details.side.after',
})

export default ProductCategoryMediaWidget
