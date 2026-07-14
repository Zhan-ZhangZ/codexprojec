import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type { EbayApiClient } from '@/api/client.js';
import { getBaseUrl } from '@/config/environment.js';
import { httpRequest } from '@/utils/http.js';
import { apiLogger } from '@/utils/logger.js';
import { isRecord } from '@/utils/type-guards.js';

const COMPAT_LEVEL = '1451';
const SITE_ID = '0';

/**
 * XML-based client for eBay Trading API calls that are not covered by REST APIs.
 */
export class TradingApiClient {
  private restClient: EbayApiClient;
  private baseUrl: string;
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor(restClient: EbayApiClient) {
    this.restClient = restClient;
    const config = restClient.getConfig();
    this.baseUrl = getBaseUrl(config.environment, config.apiBaseUrl);

    this.parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      parseTagValue: true,
      isArray: (_name: string) => {
        const arrayTags = [
          'Item',
          'Errors',
          'Error',
          'NameValueList',
          'Value',
          'ShippingServiceOptions',
          'InternationalShippingServiceOption',
          'PaymentMethods',
          'PictureURL',
          'CompatibilityList',
          'Variation',
        ];
        return arrayTags.includes(_name);
      },
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true,
    });
  }

  /**
   * Return the Trading API base URL for the configured eBay environment.
   */
  getTradingBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Execute a named Trading API call with XML request/response conversion.
   */
  async execute(
    callName: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const requestTag = `${callName}Request`;
    const responseTag = `${callName}Response`;

    const xmlObj: Record<string, unknown> = {};
    xmlObj[requestTag] = {
      '@_xmlns': 'urn:ebay:apis:eBLBaseComponents',
      ...params,
    };

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>\n${this.builder.build(xmlObj)}`;

    apiLogger.debug(`Trading API ${callName}`, { xmlBody });

    const headers: Record<string, string> = {
      'X-EBAY-API-SITEID': SITE_ID,
      'X-EBAY-API-COMPATIBILITY-LEVEL': COMPAT_LEVEL,
      'X-EBAY-API-CALL-NAME': callName,
      'Content-Type': 'text/xml',
    };

    // Proxy auth mode: omit the IAF token and skip token acquisition — the proxy
    // injects the credential the Trading API requires.
    if (!this.restClient.getConfig().disableAuthHeader) {
      headers['X-EBAY-API-IAF-TOKEN'] = await this.restClient.getOAuthClient().getAccessToken();
    }

    let responseXml: string;
    try {
      const response = await httpRequest<string>({
        method: 'POST',
        url: `${this.baseUrl}/ws/api.dll`,
        headers,
        body: xmlBody,
        timeoutMs: 30000,
        responseType: 'text',
      });
      responseXml = response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown HTTP error';
      throw new Error(`Trading API ${callName} request failed: ${message}`);
    }

    let parsed: Record<string, unknown>;
    try {
      const parsedValue = this.parser.parse(responseXml);
      if (!isRecord(parsedValue)) {
        throw new Error('Trading API response must be an object');
      }
      parsed = parsedValue;
    } catch (e) {
      throw new Error(
        `Failed to parse Trading API ${callName} response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    const resultValue = parsed[responseTag] || parsed;
    if (!isRecord(resultValue)) {
      throw new Error(`Trading API ${callName} response payload is not an object`);
    }
    const result = resultValue;

    // Log warnings without failing
    if (result.Ack === 'Warning') {
      apiLogger.warn(`Trading API ${callName} returned warnings`, {
        errors: result.Errors,
      });
    }

    // Check for eBay errors
    if (result.Ack === 'Failure' || result.Ack === 'PartialFailure') {
      const errors = result.Errors;
      const firstError = Array.isArray(errors) ? errors[0] : errors;
      const message =
        firstError?.ShortMessage || firstError?.LongMessage || 'Unknown Trading API error';
      throw new Error(message);
    }

    return result;
  }
}
