import type { EbayApiClient } from '@/api/client.js';
import { withApiError } from '@/api/shared/request.js';
import type { components } from '@/types/sell-apps/order-management/sellFulfillmentV1Oas3.js';

type DisputeSummaryResponse = components['schemas']['DisputeSummaryResponse'];
type PaymentDispute = components['schemas']['PaymentDispute'];
type PaymentDisputeActivityHistory = components['schemas']['PaymentDisputeActivityHistory'];
type FileEvidence = components['schemas']['FileEvidence'];
type AddEvidencePaymentDisputeRequest = components['schemas']['AddEvidencePaymentDisputeRequest'];
type AddEvidencePaymentDisputeResponse = components['schemas']['AddEvidencePaymentDisputeResponse'];
type UpdateEvidencePaymentDisputeRequest =
  components['schemas']['UpdateEvidencePaymentDisputeRequest'];

/**
 * Dispute API - Manage payment disputes
 * Based on: docs/sell-apps/order-management/sell_fulfillment_v1_oas3.json
 */
export class DisputeApi {
  private readonly basePath = '/sell/fulfillment/v1';

  constructor(private client: EbayApiClient) {}

  /**
   * Get payment dispute details
   */
  async getPaymentDispute(paymentDisputeId: string): Promise<PaymentDispute> {
    return await withApiError('Failed to get payment dispute', () =>
      this.client.get<PaymentDispute>(`${this.basePath}/payment_dispute/${paymentDisputeId}`)
    );
  }

  /**
   * Get payment dispute evidence file
   */
  async fetchEvidenceContent(
    paymentDisputeId: string,
    evidenceId: string,
    fileId: string
  ): Promise<ArrayBuffer> {
    const params: Record<string, string> = {
      evidence_id: evidenceId,
      file_id: fileId,
    };
    return await withApiError('Failed to fetch evidence content', () =>
      this.client.get<ArrayBuffer>(
        `${this.basePath}/payment_dispute/${paymentDisputeId}/fetch_evidence_content`,
        params
      )
    );
  }

  /**
   * Get payment dispute activity
   */
  async getActivities(paymentDisputeId: string): Promise<PaymentDisputeActivityHistory> {
    return await withApiError('Failed to get activities', () =>
      this.client.get<PaymentDisputeActivityHistory>(
        `${this.basePath}/payment_dispute/${paymentDisputeId}/activity`
      )
    );
  }

  /**
   * Search for payment disputes
   */
  async getPaymentDisputeSummaries(params?: {
    order_id?: string;
    buyer_username?: string;
    open_date_from?: string;
    open_date_to?: string;
    payment_dispute_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DisputeSummaryResponse> {
    return await withApiError('Failed to get payment dispute summaries', () =>
      this.client.get<DisputeSummaryResponse>(`${this.basePath}/payment_dispute_summary`, params)
    );
  }

  /**
   * Contest a payment dispute
   */
  async contestPaymentDispute(
    paymentDisputeId: string,
    body?: Record<string, unknown>
  ): Promise<void> {
    return await withApiError('Failed to contest payment dispute', () =>
      this.client.post<void>(`${this.basePath}/payment_dispute/${paymentDisputeId}/contest`, body)
    );
  }

  /**
   * Accept a payment dispute
   */
  async acceptPaymentDispute(
    paymentDisputeId: string,
    body?: Record<string, unknown>
  ): Promise<void> {
    return await withApiError('Failed to accept payment dispute', () =>
      this.client.post<void>(`${this.basePath}/payment_dispute/${paymentDisputeId}/accept`, body)
    );
  }

  /**
   * Upload an evidence file
   */
  async uploadEvidenceFile(
    paymentDisputeId: string,
    body: ArrayBuffer | Record<string, unknown>
  ): Promise<FileEvidence> {
    return await withApiError('Failed to upload evidence file', () =>
      this.client.post<FileEvidence>(
        `${this.basePath}/payment_dispute/${paymentDisputeId}/upload_evidence_file`,
        body,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
    );
  }

  /**
   * Add an evidence file
   */
  async addEvidence(
    paymentDisputeId: string,
    body: AddEvidencePaymentDisputeRequest
  ): Promise<AddEvidencePaymentDisputeResponse> {
    return await withApiError('Failed to add evidence', () =>
      this.client.post<AddEvidencePaymentDisputeResponse>(
        `${this.basePath}/payment_dispute/${paymentDisputeId}/add_evidence`,
        body
      )
    );
  }

  /**
   * Update an evidence file
   */
  async updateEvidence(
    paymentDisputeId: string,
    body: UpdateEvidencePaymentDisputeRequest
  ): Promise<void> {
    return await withApiError('Failed to update evidence', () =>
      this.client.post<void>(
        `${this.basePath}/payment_dispute/${paymentDisputeId}/update_evidence`,
        body
      )
    );
  }
}
