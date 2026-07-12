import { MedusaService } from '@medusajs/framework/utils'
import AppConfig from './models/app-config'

class AppConfigModuleService extends MedusaService({
  AppConfig,
}) {}

export default AppConfigModuleService
