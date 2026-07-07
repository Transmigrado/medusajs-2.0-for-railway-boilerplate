import { ModuleProviderExports } from '@medusajs/framework/types'
import FirebaseAuthProviderService from './service'

const services = [FirebaseAuthProviderService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
