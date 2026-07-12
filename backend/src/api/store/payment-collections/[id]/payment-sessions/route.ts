import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from '@medusajs/framework/utils'
import { refetchEntity } from '@medusajs/framework/http'
import { createPaymentSessionsWorkflow } from '@medusajs/medusa/core-flows'

// Overrides the core route (@medusajs/medusa) so that guest checkouts also work.
// The core `createPaymentSessionsWorkflow` only populates `context.customer` when
// the request carries a logged-in customer's `auth_context` (see core-flows'
// create-payment-session.ts: it looks up the customer by `customer_id`, which is
// `req.auth_context?.actor_id`). For guest carts there is no customer_id, so
// providers that require an email (e.g. Payku) never see one — even though the
// shopper already entered it on the cart. We fetch the cart's email via the
// cart<->payment_collection link and pass it through as `data.email`, which the
// Payku provider (src/modules/payku/service.ts) falls back to.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const collectionId = req.params.id
  const { provider_id, data } = req.body as { provider_id: string; data?: Record<string, unknown> }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const [cartCollectionRelation] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: 'cart_payment_collection',
      variables: { filters: { payment_collection_id: collectionId } },
      fields: ['cart.email'],
    })
  )
  const cartEmail = cartCollectionRelation?.cart?.email as string | undefined

  await createPaymentSessionsWorkflow(req.scope).run({
    input: {
      payment_collection_id: collectionId,
      provider_id,
      customer_id: req.auth_context?.actor_id,
      data: cartEmail ? { ...data, email: data?.email ?? cartEmail } : data,
    },
  })

  const paymentCollection = await refetchEntity({
    entity: 'payment_collection',
    idOrFilter: collectionId,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ payment_collection: paymentCollection })
}
