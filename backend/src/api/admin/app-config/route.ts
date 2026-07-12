import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { APP_CONFIG_MODULE } from '../../../modules/app-config'
import type AppConfigModuleService from '../../../modules/app-config/service'

// Admin routes are session/bearer-authenticated by default; no extra auth code
// needed here. There's only ever one row for now — GET/POST both operate on it.
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const appConfigModuleService: AppConfigModuleService = req.scope.resolve(APP_CONFIG_MODULE)
  const [appConfig] = await appConfigModuleService.listAppConfigs({}, { take: 1 })
  res.status(200).json({ app_config: appConfig ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { dummy_value } = req.body as { dummy_value: string }

  const appConfigModuleService: AppConfigModuleService = req.scope.resolve(APP_CONFIG_MODULE)
  const [existing] = await appConfigModuleService.listAppConfigs({}, { take: 1 })

  const appConfig = existing
    ? await appConfigModuleService.updateAppConfigs({ id: existing.id, dummy_value })
    : await appConfigModuleService.createAppConfigs({ dummy_value })

  res.status(200).json({ app_config: appConfig })
}
