import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { APP_CONFIG_MODULE } from '../../../modules/app-config'
import type AppConfigModuleService from '../../../modules/app-config/service'

// Public read: protected only by the publishable API key middleware Medusa
// applies to every /store route, same as the rest of the store API this app uses.
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const appConfigModuleService: AppConfigModuleService = req.scope.resolve(APP_CONFIG_MODULE)
  const [appConfig] = await appConfigModuleService.listAppConfigs({}, { take: 1 })
  res.status(200).json({ app_config: appConfig ?? null })
}
