import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  TimeDurationUnit,
  RegionType,
  ShippingCostType,
  ShippingOptionType,
  RefundMethod,
  ReturnMethod,
  ReturnShippingCostPayer,
  MarketplaceId,
} from '@/types/ebay-enums.js';

/**
 * Account Management API Schemas
 *
 * This file contains Zod schemas for all Account Management endpoints.
 * Schemas are organized by endpoint and include both input and output validation.
 */

// ============================================================================
// Common/Shared Response Schemas
// ============================================================================

const errorSchema = z.object({
  errorId: z.number().optional(),
  domain: z.string().optional(),
  category: z.string().optional(),
  message: z.string().optional(),
  longMessage: z.string().optional(),
  parameters: z
    .array(
      z.object({
        name: z.string().optional(),
        value: z.string().optional(),
      })
    )
    .optional(),
});

const timeDurationSchema = z.object({
  unit: z.nativeEnum(TimeDurationUnit).optional(),
  value: z.number().optional(),
});

const amountSchema = z.object({
  currency: z.string().optional(),
  value: z.string().optional(),
});

const regionSchema = z.object({
  regionName: z.string().optional(),
  regionType: z.nativeEnum(RegionType).optional(),
});

const regionSetSchema = z.object({
  regionIncluded: z.array(regionSchema).optional(),
  regionExcluded: z.array(regionSchema).optional(),
});

// ============================================================================
// Custom Policy Schemas
// ============================================================================

// Input
/**
 * Validates the Account Management API get custom policies request payload.
 */
export const getCustomPoliciesInputSchema = z.object({
  policyTypes: z
    .string()
    .optional()
    .describe(
      'Comma-delimited list of policy types to retrieve (e.g., PRODUCT_COMPLIANCE, TAKE_BACK)'
    ),
});

// Output
/**
 * Validates the Account Management API custom policy model.
 */
export const customPolicySchema = z.object({
  customPolicyId: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  policyType: z.string().optional(),
});

/**
 * Validates the Account Management API custom policy response payload.
 */
export const customPolicyResponseSchema = z.object({
  customPolicies: z.array(customPolicySchema).optional(),
  href: z.string().optional(),
  limit: z.number().optional(),
  next: z.string().optional(),
  offset: z.number().optional(),
  prev: z.string().optional(),
  total: z.number().optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API create custom policy request payload.
 */
export const createCustomPolicyInputSchema = z.object({
  policy: z.object({
    name: z.string(),
    description: z.string().optional(),
    policyType: z.string(),
    label: z.string().optional(),
  }),
});

/**
 * Validates the Account Management API create custom policy response payload.
 */
export const createCustomPolicyOutputSchema = customPolicySchema;

// ============================================================================
// Fulfillment Policy Schemas
// ============================================================================

const categoryTypeSchema = z.object({
  name: z.string().optional(),
  default: z.boolean().optional(),
});

const shippingServiceSchema = z.object({
  additionalShippingCost: amountSchema.optional(),
  buyerResponsibleForPickup: z.boolean().optional(),
  buyerResponsibleForShipping: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
  shippingCarrierCode: z.string().optional(),
  shippingCost: amountSchema.optional(),
  shippingServiceCode: z.string().optional(),
  shipToLocations: regionSetSchema.optional(),
  sortOrder: z.number().optional(),
  surcharge: amountSchema.optional(), // DEPRECATED but still in API
});

const shippingOptionSchema = z.object({
  costType: z.nativeEnum(ShippingCostType).optional(),
  optionType: z.nativeEnum(ShippingOptionType).optional(),
  insuranceFee: amountSchema.optional(), // DEPRECATED but in API
  insuranceOffered: z.boolean().optional(), // DEPRECATED but in API
  packageHandlingCost: amountSchema.optional(),
  rateTableId: z.string().optional(),
  shippingDiscountProfileId: z.string().optional(),
  shippingPromotionOffered: z.boolean().optional(),
  shippingServices: z.array(shippingServiceSchema).optional(),
});

/**
 * Validates the Account Management API fulfillment policy model.
 */
export const fulfillmentPolicySchema = z.object({
  name: z.string(),
  marketplaceId: z.nativeEnum(MarketplaceId),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  description: z.string().optional(),
  freightShipping: z.boolean().optional(),
  globalShipping: z.boolean().optional(),
  handlingTime: timeDurationSchema.optional(),
  localPickup: z.boolean().optional(),
  pickupDropOff: z.boolean().optional(),
  shippingOptions: z.array(shippingOptionSchema).optional(),
  shipToLocations: regionSetSchema.optional(),
});

/**
 * Validates the Account Management API fulfillment policy response payload.
 */
export const fulfillmentPolicyResponseSchema = z.object({
  fulfillmentPolicyId: z.string().optional(),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  description: z.string().optional(),
  freightShipping: z.boolean().optional(),
  globalShipping: z.boolean().optional(),
  handlingTime: timeDurationSchema.optional(),
  localPickup: z.boolean().optional(),
  marketplaceId: z.string().optional(),
  name: z.string().optional(),
  pickupDropOff: z.boolean().optional(),
  shippingOptions: z.array(shippingOptionSchema).optional(),
  shipToLocations: regionSetSchema.optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API get fulfillment policies request payload.
 */
export const getFulfillmentPoliciesInputSchema = z.object({
  marketplaceId: z.nativeEnum(MarketplaceId).describe('eBay marketplace ID (e.g., EBAY_US)'),
});

/**
 * Validates the Account Management API get fulfillment policies response payload.
 */
export const getFulfillmentPoliciesOutputSchema = z.object({
  fulfillmentPolicies: z.array(fulfillmentPolicyResponseSchema).optional(),
  href: z.string().optional(),
  limit: z.number().optional(),
  next: z.string().optional(),
  offset: z.number().optional(),
  prev: z.string().optional(),
  total: z.number().optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API create fulfillment policy request payload.
 */
export const createFulfillmentPolicyInputSchema = z.object({
  policy: fulfillmentPolicySchema,
});

/**
 * Validates the Account Management API create fulfillment policy response payload.
 */
export const createFulfillmentPolicyOutputSchema = z.object({
  fulfillmentPolicyId: z.string().optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// Payment Policy Schemas
// ============================================================================

const paymentMethodSchema = z.object({
  paymentMethodType: z.string().optional(),
  brands: z.array(z.string()).optional(), // DEPRECATED
  recipientAccountReference: z
    .object({
      referenceId: z.string().optional(),
      referenceType: z.string().optional(),
    })
    .optional(), // DEPRECATED
});

const depositSchema = z.object({
  amount: amountSchema.optional(), // Fixed from depositAmount
  dueIn: timeDurationSchema.optional(),
  paymentMethods: z.array(paymentMethodSchema).optional(), // DEPRECATED but in API
});

/**
 * Validates the Account Management API payment policy model.
 */
export const paymentPolicySchema = z.object({
  name: z.string(),
  marketplaceId: z.nativeEnum(MarketplaceId),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  description: z.string().optional(),
  deposit: depositSchema.optional(),
  fullPaymentDueIn: timeDurationSchema.optional(),
  immediatePay: z.boolean().optional(),
  paymentInstructions: z.string().optional(),
  paymentMethods: z.array(paymentMethodSchema).optional(),
});

/**
 * Validates the Account Management API payment policy response payload.
 */
export const paymentPolicyResponseSchema = z.object({
  paymentPolicyId: z.string().optional(),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  deposit: depositSchema.optional(),
  description: z.string().optional(),
  fullPaymentDueIn: timeDurationSchema.optional(),
  immediatePay: z.boolean().optional(),
  marketplaceId: z.string().optional(),
  name: z.string().optional(),
  paymentInstructions: z.string().optional(),
  paymentMethods: z.array(paymentMethodSchema).optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API get payment policies request payload.
 */
export const getPaymentPoliciesInputSchema = z.object({
  marketplaceId: z.nativeEnum(MarketplaceId).describe('eBay marketplace ID'),
});

/**
 * Validates the Account Management API get payment policies response payload.
 */
export const getPaymentPoliciesOutputSchema = z.object({
  paymentPolicies: z.array(paymentPolicyResponseSchema).optional(),
  href: z.string().optional(),
  limit: z.number().optional(),
  next: z.string().optional(),
  offset: z.number().optional(),
  prev: z.string().optional(),
  total: z.number().optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API create payment policy request payload.
 */
export const createPaymentPolicyInputSchema = z.object({
  policy: paymentPolicySchema,
});

/**
 * Validates the Account Management API create payment policy response payload.
 */
export const createPaymentPolicyOutputSchema = z.object({
  paymentPolicyId: z.string().optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// Return Policy Schemas
// ============================================================================

/**
 * Validates the Account Management API return policy model.
 */
export const returnPolicySchema = z.object({
  name: z.string(),
  marketplaceId: z.nativeEnum(MarketplaceId),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  description: z.string().optional(),
  extendedHolidayReturnsOffered: z.boolean().optional(),
  refundMethod: z.nativeEnum(RefundMethod).optional(),
  restockingFeePercentage: z.string().optional(),
  returnInstructions: z.string().optional(),
  returnMethod: z.nativeEnum(ReturnMethod).optional(),
  returnPeriod: timeDurationSchema.optional(),
  returnsAccepted: z.boolean().optional(),
  returnShippingCostPayer: z.nativeEnum(ReturnShippingCostPayer).optional(),
});

/**
 * Validates the Account Management API return policy response payload.
 */
export const returnPolicyResponseSchema = z.object({
  returnPolicyId: z.string().optional(),
  categoryTypes: z.array(categoryTypeSchema).optional(),
  description: z.string().optional(),
  extendedHolidayReturnsOffered: z.boolean().optional(),
  internationalOverride: z
    .object({
      returnMethod: z.string().optional(),
      returnPeriod: timeDurationSchema.optional(),
      returnsAccepted: z.boolean().optional(),
      returnShippingCostPayer: z.string().optional(),
    })
    .optional(),
  marketplaceId: z.string().optional(),
  name: z.string().optional(),
  refundMethod: z.string().optional(),
  restockingFeePercentage: z.string().optional(), // DEPRECATED
  returnInstructions: z.string().optional(),
  returnMethod: z.string().optional(),
  returnPeriod: timeDurationSchema.optional(),
  returnsAccepted: z.boolean().optional(),
  returnShippingCostPayer: z.string().optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API get return policies request payload.
 */
export const getReturnPoliciesInputSchema = z.object({
  marketplaceId: z.nativeEnum(MarketplaceId).describe('eBay marketplace ID'),
});

/**
 * Validates the Account Management API get return policies response payload.
 */
export const getReturnPoliciesOutputSchema = z.object({
  returnPolicies: z.array(returnPolicyResponseSchema).optional(),
  href: z.string().optional(),
  limit: z.number().optional(),
  next: z.string().optional(),
  offset: z.number().optional(),
  prev: z.string().optional(),
  total: z.number().optional(),
  warnings: z.array(errorSchema).optional(),
});

/**
 * Validates the Account Management API create return policy request payload.
 */
export const createReturnPolicyInputSchema = z.object({
  policy: returnPolicySchema,
});

/**
 * Validates the Account Management API create return policy response payload.
 */
export const createReturnPolicyOutputSchema = z.object({
  returnPolicyId: z.string().optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// Sales Tax Schemas
// ============================================================================

/**
 * Validates the Account Management API sales tax base model.
 */
export const salesTaxBaseSchema = z.object({
  salesTaxPercentage: z.string(),
  shippingAndHandlingTaxed: z.boolean().optional(),
});

/**
 * Validates the Account Management API sales tax model.
 */
export const salesTaxSchema = z.object({
  countryCode: z.string().optional(),
  jurisdictionId: z.string().optional(),
  salesTaxPercentage: z.string().optional(),
  shippingAndHandlingTaxed: z.boolean().optional(),
});

/**
 * Validates the Account Management API get sales taxes response payload.
 */
export const getSalesTaxesOutputSchema = z.object({
  salesTaxes: z.array(salesTaxSchema).optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// Program Schemas
// ============================================================================

/**
 * Validates the Account Management API program request model.
 */
export const programRequestSchema = z.object({
  programType: z.string(),
});

/**
 * Validates the Account Management API programs response payload.
 */
export const programsOutputSchema = z.object({
  programs: z
    .array(
      z.object({
        programType: z.string().optional(),
        programStatus: z.string().optional(),
      })
    )
    .optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// KYC Schemas
// ============================================================================

/**
 * Validates the Account Management API KYC response payload.
 */
export const kycOutputSchema = z.object({
  kycCheck: z.string().optional(),
  detailedStatus: z.string().optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// Privileges Schemas
// ============================================================================

/**
 * Validates the Account Management API privileges response payload.
 */
export const privilegesOutputSchema = z.object({
  sellingLimit: z
    .object({
      amount: amountSchema.optional(),
      quantity: z.number().optional(),
    })
    .optional(),
  qualifiesForSelling: z.boolean().optional(),
  sellerRegistrationCompleted: z.boolean().optional(),
  warnings: z.array(errorSchema).optional(),
});

// ============================================================================
// JSON Schema Conversion Functions
// ============================================================================

/**
 * Convert Zod schemas to JSON Schema format for MCP tools
 */
export function getAccountManagementJsonSchemas() {
  return {
    // Custom Policies
    getCustomPoliciesInput: zodToJsonSchema(getCustomPoliciesInputSchema, 'getCustomPoliciesInput'),
    getCustomPoliciesOutput: zodToJsonSchema(customPolicyResponseSchema, 'getCustomPoliciesOutput'),
    createCustomPolicyInput: zodToJsonSchema(
      createCustomPolicyInputSchema,
      'createCustomPolicyInput'
    ),
    createCustomPolicyOutput: zodToJsonSchema(
      createCustomPolicyOutputSchema,
      'createCustomPolicyOutput'
    ),

    // Fulfillment Policies
    getFulfillmentPoliciesInput: zodToJsonSchema(
      getFulfillmentPoliciesInputSchema,
      'getFulfillmentPoliciesInput'
    ),
    getFulfillmentPoliciesOutput: zodToJsonSchema(
      getFulfillmentPoliciesOutputSchema,
      'getFulfillmentPoliciesOutput'
    ),
    createFulfillmentPolicyInput: zodToJsonSchema(
      createFulfillmentPolicyInputSchema,
      'createFulfillmentPolicyInput'
    ),
    createFulfillmentPolicyOutput: zodToJsonSchema(
      createFulfillmentPolicyOutputSchema,
      'createFulfillmentPolicyOutput'
    ),
    fulfillmentPolicyDetails: zodToJsonSchema(
      fulfillmentPolicyResponseSchema,
      'fulfillmentPolicyDetails'
    ),

    // Payment Policies
    getPaymentPoliciesInput: zodToJsonSchema(
      getPaymentPoliciesInputSchema,
      'getPaymentPoliciesInput'
    ),
    getPaymentPoliciesOutput: zodToJsonSchema(
      getPaymentPoliciesOutputSchema,
      'getPaymentPoliciesOutput'
    ),
    createPaymentPolicyInput: zodToJsonSchema(
      createPaymentPolicyInputSchema,
      'createPaymentPolicyInput'
    ),
    createPaymentPolicyOutput: zodToJsonSchema(
      createPaymentPolicyOutputSchema,
      'createPaymentPolicyOutput'
    ),
    paymentPolicyDetails: zodToJsonSchema(paymentPolicyResponseSchema, 'paymentPolicyDetails'),

    // Return Policies
    getReturnPoliciesInput: zodToJsonSchema(getReturnPoliciesInputSchema, 'getReturnPoliciesInput'),
    getReturnPoliciesOutput: zodToJsonSchema(
      getReturnPoliciesOutputSchema,
      'getReturnPoliciesOutput'
    ),
    createReturnPolicyInput: zodToJsonSchema(
      createReturnPolicyInputSchema,
      'createReturnPolicyInput'
    ),
    createReturnPolicyOutput: zodToJsonSchema(
      createReturnPolicyOutputSchema,
      'createReturnPolicyOutput'
    ),
    returnPolicyDetails: zodToJsonSchema(returnPolicyResponseSchema, 'returnPolicyDetails'),

    // Sales Tax
    getSalesTaxesOutput: zodToJsonSchema(getSalesTaxesOutputSchema, 'getSalesTaxesOutput'),
    salesTaxDetails: zodToJsonSchema(salesTaxSchema, 'salesTaxDetails'),

    // Programs
    programRequest: zodToJsonSchema(programRequestSchema, 'programRequest'),
    programsOutput: zodToJsonSchema(programsOutputSchema, 'programsOutput'),

    // KYC & Privileges
    kycOutput: zodToJsonSchema(kycOutputSchema, 'kycOutput'),
    privilegesOutput: zodToJsonSchema(privilegesOutputSchema, 'privilegesOutput'),
  };
}
