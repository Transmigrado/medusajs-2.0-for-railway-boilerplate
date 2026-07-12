import { ExecArgs } from '@medusajs/framework/types'
import { APP_CONFIG_MODULE } from '../modules/app-config'
import AppConfigModuleService from '../modules/app-config/service'

export default async function seedAppConfig({ container }: ExecArgs) {
  const logger = container.resolve('logger')
  const appConfigModuleService: AppConfigModuleService = container.resolve(APP_CONFIG_MODULE)

  const [existing] = await appConfigModuleService.listAppConfigs({}, { take: 1 })
  if (existing) {
    logger.info(`AppConfig already exists (id: ${existing.id}), skipping.`)
    return
  }

  const appConfig = await appConfigModuleService.createAppConfigs({
    dummy_value: 'hello-from-medusa-admin',
  })
  logger.info(`Created AppConfig ${appConfig.id} with dummy_value="${appConfig.dummy_value}"`)
}
