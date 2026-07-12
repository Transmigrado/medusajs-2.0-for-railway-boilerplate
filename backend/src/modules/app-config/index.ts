import { Module } from '@medusajs/framework/utils'
import AppConfigModuleService from './service'

export const APP_CONFIG_MODULE = 'app_config'

export default Module(APP_CONFIG_MODULE, {
  service: AppConfigModuleService,
})
