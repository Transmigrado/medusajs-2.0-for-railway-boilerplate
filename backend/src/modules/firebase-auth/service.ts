import { AbstractAuthModuleProvider, MedusaError } from '@medusajs/framework/utils'
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from '@medusajs/framework/types'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

type InjectedDependencies = {
  logger: Logger
}

type Options = {
  projectId: string
}

// Verifying a Firebase ID token only needs the project id (it's checked against
// the `aud` claim); no service account credentials are required for this.
class FirebaseAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = 'firebase-auth'
  static DISPLAY_NAME = 'Firebase'

  protected logger_: Logger
  protected options_: Options

  constructor({ logger }: InjectedDependencies, options: Options) {
    super(...arguments)
    this.logger_ = logger
    this.options_ = options

    if (!getApps().length) {
      initializeApp({ projectId: options.projectId })
    }
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.projectId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Firebase auth provider requires a "projectId" option (set FIREBASE_PROJECT_ID).'
      )
    }
  }

  // The RN app only ever calls the non-register route (POST /auth/customer/firebase-auth)
  // with a Firebase ID token; this resolves the matching auth identity or creates it on
  // first sign-in, so there's no separate register step to keep in sync.
  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const idToken = data.body?.idToken as string | undefined
    if (!idToken) {
      return { success: false, error: 'Missing Firebase ID token.' }
    }

    let decoded
    try {
      decoded = await getAuth().verifyIdToken(idToken)
    } catch {
      return { success: false, error: 'Invalid or expired Firebase ID token.' }
    }

    if (!decoded.email) {
      return { success: false, error: 'The Firebase account has no email address.' }
    }

    try {
      const authIdentity = await authIdentityProviderService.retrieve({
        entity_id: decoded.uid,
      })
      return { success: true, authIdentity }
    } catch {
      const authIdentity = await authIdentityProviderService.create({
        entity_id: decoded.uid,
        user_metadata: { email: decoded.email },
      })
      return { success: true, authIdentity }
    }
  }
}

export default FirebaseAuthProviderService
