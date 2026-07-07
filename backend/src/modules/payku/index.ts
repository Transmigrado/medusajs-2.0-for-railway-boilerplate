import { ModuleProviderExports } from '@medusajs/framework/types'
import PaykuProviderService from './service'

const services = [PaykuProviderService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
