import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import crypto from 'node:crypto'

type InjectedDependencies = {
  logger: Logger
}

type Options = {
  publicToken: string
  privateToken: string
  baseUrl: string
  urlReturn: string
  urlNotify: string
  paymentMethod?: number
}

type PaykuStatus = 'register' | 'pending' | 'success' | 'rejected'

type PaykuTransactionResponse = {
  status: PaykuStatus
  id: string
  url?: string
}

type PaykuTransactionDetail = {
  status: PaykuStatus
  id: string
  order: string
  amount: string
  gateway_response?: { status: string; message: string }
}

// Payku is a redirect-based gateway (like Webpay): initiatePayment creates the
// transaction and returns a URL the storefront must open; the payer completes the
// charge on Payku's hosted page, and Payku confirms the result via `urlnotify`
// (handled by Medusa's built-in /hooks/payment/{provider_id} route).
class PaykuProviderService extends AbstractPaymentProvider<Options> {
  static identifier = 'payku'
  static DISPLAY_NAME = 'Payku'

  protected logger_: Logger
  protected options_: Options

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.publicToken || !options.privateToken) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Payku requires "publicToken" and "privateToken" options.'
      )
    }
    if (!options.baseUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Payku requires a "baseUrl" option (sandbox or production server).'
      )
    }
    if (!options.urlReturn || !options.urlNotify) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Payku requires "urlReturn" and "urlNotify" options.'
      )
    }
  }

  private async fetchPayku<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.options_.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.options_.publicToken}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        body?.message ?? body?.error ?? `Payku request failed with status ${response.status}`
      )
    }
    return body
  }

  // Only /api/nullification (refunds) requires this HMAC signature; the basic
  // create/get transaction routes just use the Bearer public token. Concat/signing
  // rule matches Payku's own official Postman collection pre-request scripts.
  private sign(path: string, body: Record<string, unknown>): string {
    const query = Object.keys(body)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(body[key]))}`)
      .join('&')
      .replace(/%20/g, '+')
    return crypto
      .createHmac('sha256', this.options_.privateToken)
      .update(`${path}&${query}`)
      .digest('hex')
  }

  private toAmount(amount: unknown): number {
    return Math.round(new BigNumber(amount as never).numeric)
  }

  private mapStatus(status: PaykuStatus): PaymentSessionStatus {
    switch (status) {
      case 'success':
        return PaymentSessionStatus.CAPTURED
      case 'rejected':
        return PaymentSessionStatus.ERROR
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data, context } = input
    const sessionId = data?.session_id as string | undefined
    if (!sessionId) {
      throw new Error('Payku requires a payment session id to create a transaction.')
    }

    // context.customer is only populated by Medusa's core workflow for logged-in
    // customers (it's keyed off req.auth_context, see the payment-sessions route
    // override); guest carts fall back to the email the route resolved from the
    // cart itself and passed through as data.email.
    const email = context?.customer?.email ?? (data?.email as string | undefined)
    if (!email) {
      throw new Error('Payku requires the customer email; none was available on this cart.')
    }

    const requestBody = {
      email,
      order: sessionId,
      subject: 'Coffee Vogue order',
      amount: this.toAmount(amount),
      currency: currency_code.toUpperCase(),
      payment: this.options_.paymentMethod ?? 99,
      urlreturn: this.options_.urlReturn,
      urlnotify: this.options_.urlNotify,
    }

    const response = await this.fetchPayku<PaykuTransactionResponse>('/api/transaction', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Payku can respond 200 OK with a "failed"/incomplete body instead of a non-2xx
    // status (e.g. invalid amount/email), so this can't just be inferred from `fetchPayku`
    // not throwing — without an id/url there's nothing usable to hand to the payer.
    if (!response.id || !response.url) {
      this.logger_.error(
        `Payku did not return a usable transaction. Request: ${JSON.stringify(requestBody)} — Response: ${JSON.stringify(response)}`
      )
      throw new Error(
        `Payku could not create a transaction (status: ${response.status ?? 'unknown'}).`
      )
    }

    return {
      id: response.id,
      status: this.mapStatus(response.status),
      data: {
        session_id: sessionId,
        id: response.id,
        redirect_url: response.url,
        status: response.status,
      },
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      return { status: PaymentSessionStatus.PENDING, data: input.data }
    }
    const detail = await this.fetchPayku<PaykuTransactionDetail>(`/api/transaction/${id}`)
    return { status: this.mapStatus(detail.status), data: { ...input.data, status: detail.status } }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const result = await this.getPaymentStatus(input)
    return { status: result.status, data: result.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      return { data: input.data }
    }
    const detail = await this.fetchPayku<PaykuTransactionDetail>(`/api/transaction/${id}`)
    return { data: { ...input.data, ...detail } }
  }

  // Payku settles funds the moment the payer completes checkout on their hosted
  // page — there's no separate capture step to call, so this just re-verifies.
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return this.retrievePayment(input)
  }

  // A not-yet-paid Payku transaction can't be cancelled through their API; nothing
  // to reverse, so this is a no-op (matches Medusa's own guidance for such providers).
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  // Payku transactions can't be amended once created; start a fresh one for the new amount.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input)
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new Error('Missing Payku transaction id for refund.')
    }
    const body = {
      id,
      amount: this.toAmount(input.amount),
      subject: 'Refund',
    }
    const result = await this.fetchPayku('/api/nullification', {
      method: 'POST',
      headers: { Sign: this.sign('/api/nullification', body) },
      body: JSON.stringify(body),
    })
    return { data: { ...input.data, nullification: result } }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload['payload']
  ): Promise<WebhookActionResult> {
    // Payku's notify body: { transaction_id, payment_key, transaction_key,
    // verification_key, order, status }. GET /api/transaction/{id} only accepts
    // payment_key or transaction_key as a lookup id — NOT transaction_id, despite
    // the name (that field is Payku's own internal numeric id).
    const body = payload.data as {
      order?: string
      payment_key?: string
      transaction_key?: string
    }
    const sessionId = body.order
    const lookupId = body.payment_key ?? body.transaction_key
    if (!sessionId || !lookupId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    // Don't trust the webhook body's status directly; re-verify against Payku.
    const detail = await this.fetchPayku<PaykuTransactionDetail>(`/api/transaction/${lookupId}`)
    const amount = new BigNumber(detail.amount)

    switch (detail.status) {
      case 'success':
        return { action: PaymentActions.SUCCESSFUL, data: { session_id: sessionId, amount } }
      case 'rejected':
        return { action: PaymentActions.FAILED, data: { session_id: sessionId, amount } }
      default:
        return { action: PaymentActions.PENDING, data: { session_id: sessionId, amount } }
    }
  }
}

export default PaykuProviderService
