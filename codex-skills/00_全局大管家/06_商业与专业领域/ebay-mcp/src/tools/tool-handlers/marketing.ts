import type { ToolHandlerMap } from './types.js';

/** Handler map for Marketing API campaign, ad, promotion, and reporting tools. */
export const marketingHandlers: ToolHandlerMap = {
  ebay_get_campaigns: async (api, args) => {
    return await api.marketing.getCampaigns(
      args.campaignStatus as string,
      args.marketplaceId as string,
      args.limit as number
    );
  },

  ebay_get_campaign: async (api, args) => {
    return await api.marketing.getCampaign(args.campaignId as string);
  },

  ebay_get_campaign_by_name: async (api, args) => {
    return await api.marketing.getCampaignByName(args.campaignName as string);
  },

  ebay_create_campaign: async (api, args) => {
    return await api.marketing.createCampaign(args.campaign as Record<string, unknown>);
  },

  ebay_clone_campaign: async (api, args) => {
    return await api.marketing.cloneCampaign(
      args.campaignId as string,
      args.cloneData as Record<string, unknown>
    );
  },

  ebay_pause_campaign: async (api, args) => {
    return await api.marketing.pauseCampaign(args.campaignId as string);
  },

  ebay_resume_campaign: async (api, args) => {
    return await api.marketing.resumeCampaign(args.campaignId as string);
  },

  ebay_end_campaign: async (api, args) => {
    return await api.marketing.endCampaign(args.campaignId as string);
  },

  ebay_update_campaign_identification: async (api, args) => {
    return await api.marketing.updateCampaignIdentification(
      args.campaignId as string,
      args.updateData as Record<string, unknown>
    );
  },

  ebay_bulk_create_ads_by_inventory_reference: async (api, args) => {
    return await api.marketing.bulkCreateAdsByInventoryReference(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_create_ads_by_listing_id: async (api, args) => {
    return await api.marketing.bulkCreateAdsByListingId(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_delete_ads_by_inventory_reference: async (api, args) => {
    return await api.marketing.bulkDeleteAdsByInventoryReference(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_delete_ads_by_inventory_reference: async (api, args) => {
    return await api.marketing.deleteAdsByInventoryReference(args.campaignId as string, {
      inventoryReferenceId: args.inventoryReferenceId,
      inventoryReferenceType: args.inventoryReferenceType,
    });
  },

  ebay_bulk_delete_ads_by_listing_id: async (api, args) => {
    return await api.marketing.bulkDeleteAdsByListingId(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_update_ads_bid_by_inventory_reference: async (api, args) => {
    return await api.marketing.bulkUpdateAdsBidByInventoryReference(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_update_ads_bid_by_listing_id: async (api, args) => {
    return await api.marketing.bulkUpdateAdsBidByListingId(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_update_ads_status: async (api, args) => {
    return await api.marketing.bulkUpdateAdsStatus(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_bulk_update_ads_status_by_listing_id: async (api, args) => {
    return await api.marketing.bulkUpdateAdsStatusByListingId(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_create_ad: async (api, args) => {
    return await api.marketing.createAd(
      args.campaignId as string,
      args.ad as Record<string, unknown>
    );
  },

  ebay_create_ads_by_inventory_reference: async (api, args) => {
    return await api.marketing.createAdsByInventoryReference(
      args.campaignId as string,
      args.ads as Record<string, unknown>
    );
  },

  ebay_get_ad: async (api, args) => {
    return await api.marketing.getAd(args.campaignId as string, args.adId as string);
  },

  ebay_get_ads: async (api, args) => {
    return await api.marketing.getAds(
      args.campaignId as string,
      args.adGroupIds as string,
      args.adStatus as string,
      args.limit as number,
      args.listingIds as string,
      args.offset as number
    );
  },

  ebay_get_ads_by_inventory_reference: async (api, args) => {
    return await api.marketing.getAdsByInventoryReference(
      args.campaignId as string,
      args.inventoryReferenceId as string,
      args.inventoryReferenceType as string
    );
  },

  ebay_get_ads_by_listing_id: async (api, args) => {
    return await api.marketing.getAdsByListingId(
      args.campaignId as string,
      args.listingId as string
    );
  },

  ebay_delete_ad: async (api, args) => {
    return await api.marketing.deleteAd(args.campaignId as string, args.adId as string);
  },

  ebay_clone_ad: async (api, args) => {
    return await api.marketing.cloneAd(
      args.campaignId as string,
      args.adId as string,
      args.ad as Record<string, unknown>
    );
  },

  ebay_update_ad_bid: async (api, args) => {
    return await api.marketing.updateBid(
      args.campaignId as string,
      args.adId as string,
      args.bidData as Record<string, unknown>
    );
  },

  ebay_create_ad_group: async (api, args) => {
    return await api.marketing.createAdGroup(
      args.campaignId as string,
      args.adGroup as Record<string, unknown>
    );
  },

  ebay_get_ad_group: async (api, args) => {
    return await api.marketing.getAdGroup(args.campaignId as string, args.adGroupId as string);
  },

  ebay_get_ad_groups: async (api, args) => {
    return await api.marketing.getAdGroups(
      args.campaignId as string,
      args.adGroupStatus as string,
      args.limit as number,
      args.offset as number
    );
  },

  ebay_clone_ad_group: async (api, args) => {
    return await api.marketing.cloneAdGroup(
      args.campaignId as string,
      args.adGroupId as string,
      args.adGroup as Record<string, unknown>
    );
  },

  ebay_update_ad_group_bids: async (api, args) => {
    return await api.marketing.updateAdGroupBids(
      args.campaignId as string,
      args.adGroupId as string,
      args.bidsData as Record<string, unknown>
    );
  },

  ebay_update_ad_group_keywords: async (api, args) => {
    return await api.marketing.updateAdGroupKeywords(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywordsData as Record<string, unknown>
    );
  },

  ebay_create_keyword: async (api, args) => {
    return await api.marketing.createKeyword(
      args.campaignId as string,
      args.adGroupId as string,
      args.keyword as Record<string, unknown>
    );
  },

  ebay_get_keyword: async (api, args) => {
    return await api.marketing.getKeyword(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywordId as string
    );
  },

  ebay_get_keywords: async (api, args) => {
    return await api.marketing.getKeywords(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywordStatus as string,
      args.limit as number,
      args.offset as number
    );
  },

  ebay_delete_keyword: async (api, args) => {
    return await api.marketing.deleteKeyword(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywordId as string
    );
  },

  ebay_update_keyword_bid: async (api, args) => {
    return await api.marketing.updateKeywordBid(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywordId as string,
      args.bidData as Record<string, unknown>
    );
  },

  ebay_bulk_create_keywords: async (api, args) => {
    return await api.marketing.bulkCreateKeywords(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywords as Record<string, unknown>
    );
  },

  ebay_bulk_delete_keywords: async (api, args) => {
    return await api.marketing.bulkDeleteKeywords(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywords as Record<string, unknown>
    );
  },

  ebay_bulk_update_keyword_bids: async (api, args) => {
    return await api.marketing.bulkUpdateKeywordBids(
      args.campaignId as string,
      args.adGroupId as string,
      args.keywords as Record<string, unknown>
    );
  },

  ebay_get_negative_keywords: async (api, args) => {
    return await api.marketing.getNegativeKeywords(
      args.campaignIds as string,
      args.adGroupIds as string,
      args.negativeKeywordStatus as string,
      args.limit as number,
      args.offset as number
    );
  },

  ebay_get_negative_keyword: async (api, args) => {
    return await api.marketing.getNegativeKeyword(args.negativeKeywordId as string);
  },

  ebay_create_negative_keyword: async (api, args) => {
    return await api.marketing.createNegativeKeyword(args);
  },

  ebay_update_negative_keyword: async (api, args) => {
    return await api.marketing.updateNegativeKeyword(args.negativeKeywordId as string, {
      negativeKeywordStatus: args.negativeKeywordStatus as string,
    });
  },

  ebay_bulk_create_negative_keywords: async (api, args) => {
    return await api.marketing.bulkCreateNegativeKeywords({
      requests: args.requests as Record<string, unknown>[],
    });
  },

  ebay_bulk_update_negative_keywords: async (api, args) => {
    return await api.marketing.bulkUpdateNegativeKeywords({
      requests: args.requests as Record<string, unknown>[],
    });
  },

  ebay_create_targeting: async (api, args) => {
    return await api.marketing.createTargeting(
      args.campaignId as string,
      args.targeting as Record<string, unknown>
    );
  },

  ebay_get_targeting: async (api, args) => {
    return await api.marketing.getTargeting(args.campaignId as string);
  },

  ebay_update_targeting: async (api, args) => {
    return await api.marketing.updateTargeting(
      args.campaignId as string,
      args.targeting as Record<string, unknown>
    );
  },

  ebay_suggest_bids: async (api, args) => {
    return await api.marketing.suggestBids(args.campaignId as string, args.adGroupId as string);
  },

  ebay_suggest_keywords: async (api, args) => {
    return await api.marketing.suggestKeywords(
      args.campaignId as string,
      args.adGroupId as string,
      args.suggestion as Record<string, unknown>
    );
  },

  ebay_create_report_task: async (api, args) => {
    return await api.marketing.createReportTask(args.reportTask as Record<string, unknown>);
  },

  ebay_get_report_task: async (api, args) => {
    return await api.marketing.getReportTask(args.reportTaskId as string);
  },

  ebay_get_report_tasks: async (api, args) => {
    return await api.marketing.getReportTasks(
      args.reportTaskStatuses as string,
      args.limit as number,
      args.offset as number
    );
  },

  ebay_get_ad_report: async (api, args) => {
    return await api.marketing.getAdReport(
      args.dimension as string,
      args.metric as string,
      args.reportStartDate as string,
      args.reportEndDate as string,
      args.sort as string,
      args.listingIds as string,
      args.marketplaceId as string
    );
  },

  ebay_get_ad_report_metadata: async (api, _args) => {
    return await api.marketing.getAdReportMetadata();
  },

  ebay_get_ad_report_metadata_for_report_type: async (api, args) => {
    return await api.marketing.getAdReportMetadataForReportType(args.reportType as string);
  },

  ebay_get_ad_report_metadata_for_type: async (api, args) => {
    return await api.marketing.getAdReportMetadataForReportType(args.reportType as string);
  },

  ebay_get_promotions: async (api, args) => {
    return await api.marketing.getPromotions(
      args.marketplaceId as string,
      args.limit as number,
      args.offset as number,
      args.promotionStatus as string,
      args.promotionType as string
    );
  },

  ebay_get_item_promotion: async (api, args) => {
    return await api.marketing.getItemPromotion(args.promotionId as string);
  },

  ebay_create_item_promotion: async (api, args) => {
    return await api.marketing.createPromotion(args.promotion as Record<string, unknown>);
  },

  ebay_update_item_promotion: async (api, args) => {
    return await api.marketing.updateItemPromotion(
      args.promotionId as string,
      args.promotion as Record<string, unknown>
    );
  },

  ebay_delete_item_promotion: async (api, args) => {
    return await api.marketing.deleteItemPromotion(args.promotionId as string);
  },

  ebay_pause_item_promotion: async (api, args) => {
    return await api.marketing.pauseItemPromotion(args.promotionId as string);
  },

  ebay_resume_item_promotion: async (api, args) => {
    return await api.marketing.resumeItemPromotion(args.promotionId as string);
  },

  ebay_get_promotion_report: async (api, args) => {
    return await api.marketing.getPromotionReport(
      args.marketplaceId as string,
      args.promotionStatus as string,
      args.limit as number,
      args.offset as number
    );
  },

  ebay_get_promotion_summary_report: async (api, args) => {
    return await api.marketing.getPromotionSummaryReport(args.marketplaceId as string);
  },

  ebay_delete_campaign: async (api, args) => {
    return await api.marketing.deleteCampaign(args.campaignId as string);
  },

  ebay_launch_campaign: async (api, args) => {
    return await api.marketing.launchCampaign(args.campaignId as string);
  },

  ebay_find_campaign_by_ad_reference: async (api, args) => {
    return await api.marketing.findCampaignByAdReference(
      args.inventoryReferenceId as string | undefined,
      args.inventoryReferenceType as string | undefined,
      args.listingId as string | undefined
    );
  },

  ebay_setup_quick_campaign: async (api, args) => {
    return await api.marketing.setupQuickCampaign(args.quickCampaign as Record<string, unknown>);
  },

  ebay_suggest_budget: async (api, args) => {
    return await api.marketing.suggestBudget(args.campaignId as string | undefined);
  },

  ebay_suggest_items: async (api, args) => {
    return await api.marketing.suggestItems(args.campaignId as string);
  },

  ebay_suggest_max_cpc: async (api, args) => {
    return await api.marketing.suggestMaxCpc(args.suggestionRequest as Record<string, unknown>);
  },

  ebay_update_ad_rate_strategy: async (api, args) => {
    return await api.marketing.updateAdRateStrategy(
      args.campaignId as string,
      args.strategy as Record<string, unknown>
    );
  },

  ebay_update_bidding_strategy: async (api, args) => {
    return await api.marketing.updateBiddingStrategy(
      args.campaignId as string,
      args.strategy as Record<string, unknown>
    );
  },

  ebay_update_campaign_budget: async (api, args) => {
    return await api.marketing.updateCampaignBudget(
      args.campaignId as string,
      args.budget as Record<string, unknown>
    );
  },

  ebay_update_ad_group: async (api, args) => {
    return await api.marketing.updateAdGroup(
      args.campaignId as string,
      args.adGroupId as string,
      args.updateData as Record<string, unknown>
    );
  },

  ebay_update_keyword: async (api, args) => {
    return await api.marketing.updateKeyword(
      args.campaignId as string,
      args.keywordId as string,
      args.updateData as Record<string, unknown>
    );
  },

  ebay_bulk_create_campaign_keyword: async (api, args) => {
    return await api.marketing.bulkCreateKeyword(
      args.campaignId as string,
      args.keywords as Record<string, unknown>
    );
  },

  ebay_bulk_update_campaign_keyword: async (api, args) => {
    return await api.marketing.bulkUpdateKeyword(
      args.campaignId as string,
      args.keywords as Record<string, unknown>
    );
  },

  ebay_get_report: async (api, args) => {
    return await api.marketing.getReport(args.reportId as string);
  },

  ebay_delete_report_task: async (api, args) => {
    return await api.marketing.deleteReportTask(args.reportTaskId as string);
  },

  ebay_create_item_price_markdown_promotion: async (api, args) => {
    return await api.marketing.createItemPriceMarkdownPromotion(
      args.promotion as Record<string, unknown>
    );
  },

  ebay_get_item_price_markdown_promotion: async (api, args) => {
    return await api.marketing.getItemPriceMarkdownPromotion(args.promotionId as string);
  },

  ebay_update_item_price_markdown_promotion: async (api, args) => {
    return await api.marketing.updateItemPriceMarkdownPromotion(
      args.promotionId as string,
      args.promotion as Record<string, unknown>
    );
  },

  ebay_delete_item_price_markdown_promotion: async (api, args) => {
    return await api.marketing.deleteItemPriceMarkdownPromotion(args.promotionId as string);
  },

  ebay_get_listing_set: async (api, args) => {
    return await api.marketing.getListingSet(args.promotionId as string);
  },

  ebay_pause_promotion: async (api, args) => {
    return await api.marketing.pausePromotion(args.promotionId as string);
  },

  ebay_resume_promotion: async (api, args) => {
    return await api.marketing.resumePromotion(args.promotionId as string);
  },

  ebay_get_email_campaigns: async (api, args) => {
    return await api.marketing.getEmailCampaigns(
      args.limit as number | undefined,
      args.offset as number | undefined
    );
  },

  ebay_create_email_campaign: async (api, args) => {
    return await api.marketing.createEmailCampaign(args.emailCampaign as Record<string, unknown>);
  },

  ebay_get_email_campaign: async (api, args) => {
    return await api.marketing.getEmailCampaign(args.emailCampaignId as string);
  },

  ebay_update_email_campaign: async (api, args) => {
    return await api.marketing.updateEmailCampaign(
      args.emailCampaignId as string,
      args.emailCampaign as Record<string, unknown>
    );
  },

  ebay_delete_email_campaign: async (api, args) => {
    return await api.marketing.deleteEmailCampaign(args.emailCampaignId as string);
  },

  ebay_get_email_audiences: async (api, _args) => {
    return await api.marketing.getAudiences();
  },

  ebay_get_email_preview: async (api, args) => {
    return await api.marketing.getEmailPreview(args.emailCampaignId as string);
  },

  ebay_get_email_report: async (api, args) => {
    return await api.marketing.getEmailReport(
      args.limit as number | undefined,
      args.offset as number | undefined
    );
  },

  ebay_find_listing_recommendations: async (api, args) => {
    return await api.recommendation.findListingRecommendations(
      args.listingIds ? { listingIds: args.listingIds as string[] } : undefined,
      args.filter as string,
      args.limit as number,
      args.offset as number,
      args.marketplaceId as string
    );
  },
};
