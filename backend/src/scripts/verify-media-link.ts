import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { MEDIA_MODULE } from '../modules/media'

export default async function verifyMediaLink({ container }: ExecArgs) {
  const logger = container.resolve('logger')
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const mediaModuleService = container.resolve(MEDIA_MODULE)

  const [category] = await productModuleService.createProductCategories([
    { name: 'Test Category (verify script)' },
  ])
  logger.info(`Created category ${category.id}`)

  const media = await mediaModuleService.createMedia({
    url: 'https://example.com/test.png',
    width: 200,
    height: 200,
  })
  logger.info(`Created media ${media.id}`)

  await link.create([
    { [Modules.PRODUCT]: { product_category_id: category.id }, [MEDIA_MODULE]: { media_id: media.id } },
  ])
  logger.info('Linked media to category')

  const { data } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'name', 'media.id', 'media.url', 'media.width', 'media.height'],
    filters: { id: category.id },
  })
  logger.info(`Read-back via fields=: ${JSON.stringify(data[0])}`)

  await link.dismiss([
    { [Modules.PRODUCT]: { product_category_id: category.id }, [MEDIA_MODULE]: { media_id: media.id } },
  ])
  await mediaModuleService.deleteMedia([media.id])
  await productModuleService.deleteProductCategories([category.id])
  logger.info('Cleaned up test data')
}
