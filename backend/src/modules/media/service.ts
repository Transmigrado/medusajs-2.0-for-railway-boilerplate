import { MedusaService } from '@medusajs/framework/utils'
import Media from './models/media'

class MediaModuleService extends MedusaService({
  Media,
}) {}

export default MediaModuleService
