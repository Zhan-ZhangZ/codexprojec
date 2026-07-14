import type { TradingApiClient } from '@/api/client-trading.js';
import { isRecord } from '@/utils/type-guards.js';

interface ListingSummary {
  itemId: string;
  title: string;
  sku: string;
  quantity: number;
  quantityAvailable: number;
  currentPrice: number;
  watchCount: number;
  listingType: string;
}

interface ActiveListingsResult {
  listings: ListingSummary[];
  total: number;
  totalPages: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry)
  );
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

/**
 * High-level wrapper for seller listing operations backed by eBay Trading API calls.
 */
export class TradingApi {
  constructor(private client: TradingApiClient) {}

  /**
   * Fetch active seller listings with Trading API pagination metadata.
   */
  async getActiveListings(page = 1, entriesPerPage = 50): Promise<ActiveListingsResult> {
    const result = await this.client.execute('GetMyeBaySelling', {
      ActiveList: {
        Sort: 'TimeLeft',
        Pagination: {
          EntriesPerPage: entriesPerPage,
          PageNumber: page,
        },
      },
    });

    const activeList = asRecord(result.ActiveList);
    const itemArray = asRecord(activeList?.ItemArray);
    const items = asRecordArray(itemArray?.Item);
    const pagination = asRecord(activeList?.PaginationResult);

    const listings: ListingSummary[] = items.map((item) => {
      const sellingStatus = asRecord(item.SellingStatus);
      const currentPriceRaw = sellingStatus?.CurrentPrice;
      const currentPrice =
        typeof currentPriceRaw === 'number' || isRecord(currentPriceRaw)
          ? currentPriceRaw
          : undefined;
      const priceValue =
        typeof currentPrice === 'object' && currentPrice !== null
          ? Number(currentPrice['#text'] || 0)
          : Number(currentPrice || 0);

      return {
        itemId: stringValue(item.ItemID),
        title: stringValue(item.Title),
        sku: stringValue(item.SKU),
        quantity: Number(item.Quantity || 0),
        quantityAvailable: Number(item.QuantityAvailable || 0),
        currentPrice: priceValue,
        watchCount: Number(item.WatchCount || 0),
        listingType: stringValue(item.ListingType),
      };
    });

    return {
      listings,
      total: Number(pagination?.TotalNumberOfEntries || 0),
      totalPages: Number(pagination?.TotalNumberOfPages || 0),
    };
  }

  /**
   * Fetch a single listing by eBay item ID with full Trading API detail.
   */
  async getListing(itemId: string): Promise<Record<string, unknown>> {
    if (!itemId) throw new Error('itemId is required');

    const result = await this.client.execute('GetItem', {
      ItemID: itemId,
      DetailLevel: 'ReturnAll',
    });

    const items = asRecordArray(result.Item);
    return items?.[0] || result;
  }

  /**
   * Create a fixed-price listing using the supplied Trading API item payload.
   */
  async createListing(item: Record<string, unknown>): Promise<Record<string, unknown>> {
    return await this.client.execute('AddFixedPriceItem', { Item: item });
  }

  /**
   * Revise a fixed-price listing by merging changes with the eBay item ID.
   */
  async reviseListing(
    itemId: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!itemId) throw new Error('itemId is required');

    return await this.client.execute('ReviseFixedPriceItem', {
      Item: { ...fields, ItemID: itemId },
    });
  }

  /**
   * End a fixed-price listing with the provided Trading API ending reason.
   */
  async endListing(itemId: string, reason = 'NotAvailable'): Promise<Record<string, unknown>> {
    if (!itemId) throw new Error('itemId is required');

    return await this.client.execute('EndFixedPriceItem', {
      ItemID: itemId,
      EndingReason: reason,
    });
  }

  /**
   * Relist an ended fixed-price item with optional listing modifications.
   */
  async relistItem(
    itemId: string,
    modifications?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!itemId) throw new Error('itemId is required');

    return await this.client.execute('RelistFixedPriceItem', {
      Item: { ...modifications, ItemID: itemId },
    });
  }
}
