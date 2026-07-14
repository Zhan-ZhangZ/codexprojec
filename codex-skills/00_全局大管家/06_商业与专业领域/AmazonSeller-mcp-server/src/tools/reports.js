import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const reportsTools = {
      createReport: {
        schema: {
          reportType: z.string().describe("The report type"),
          marketplaceIds: z.array(z.string()).optional().describe("List of marketplace IDs"),
          dataStartTime: z.string().optional().describe("The start of a date and time range, in ISO 8601 format"),
          dataEndTime: z.string().optional().describe("The end of a date and time range, in ISO 8601 format")
        },
        handler: async ({ reportType, marketplaceIds, dataStartTime, dataEndTime }) => {
          try {
            const payload = {
              reportType,
              marketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID]
            };
            
            if (dataStartTime) {
              payload.dataStartTime = dataStartTime;
            }
            
            if (dataEndTime) {
              payload.dataEndTime = dataEndTime;
            }
            
            const data = await makeSpApiRequest(
              'POST',
              '/reports/2021-06-30/reports',
              payload
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error creating report: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Create a report request"
      },
      
      getReport: {
        schema: {
          reportId: z.string().describe("The report ID")
        },
        handler: async ({ reportId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/reports/2021-06-30/reports/${reportId}`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving report: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get information about a report"
      },
      
      getReportDocument: {
        schema: {
          reportDocumentId: z.string().describe("The report document ID")
        },
        handler: async ({ reportDocumentId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/reports/2021-06-30/documents/${reportDocumentId}`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving report document: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get information about a report document"
      },
      
      getReports: {
        schema: {
          reportTypes: z.array(z.string()).optional().describe("A list of report types"),
          processingStatuses: z.array(z.string()).optional().describe("A list of processing statuses"),
          marketplaceIds: z.array(z.string()).optional().describe("A list of marketplace IDs"),
          maxResults: z.number().int().optional().describe("Maximum number of results to return")
        },
        handler: async ({ reportTypes, processingStatuses, marketplaceIds, maxResults }) => {
          try {
            const queryParams = {};
            
            if (reportTypes && reportTypes.length > 0) {
              queryParams.reportTypes = reportTypes.join(',');
            }
            
            if (processingStatuses && processingStatuses.length > 0) {
              queryParams.processingStatuses = processingStatuses.join(',');
            }
            
            if (marketplaceIds && marketplaceIds.length > 0) {
              queryParams.marketplaceIds = marketplaceIds.join(',');
            }
            
            if (maxResults) {
              queryParams.maxResults = maxResults;
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/reports/2021-06-30/reports',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error retrieving reports: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Get a list of reports"
      }
    };
