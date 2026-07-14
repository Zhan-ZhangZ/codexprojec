import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const financeTools = {
      listFinancialEventGroups: {
        schema: {
          maxResultsPerPage: z.number().int().optional().describe("The maximum number of results to return per page"),
          financialEventGroupStartedAfter: z.string().optional().describe("A date used for selecting financial event groups that opened after (or at) a specified date and time"),
          financialEventGroupStartedBefore: z.string().optional().describe("A date used for selecting financial event groups that opened before (or at) a specified date and time")
        },
        handler: async ({ maxResultsPerPage, financialEventGroupStartedAfter, financialEventGroupStartedBefore }) => {
          try {
            const queryParams = {};
            
            if (maxResultsPerPage) {
              queryParams.MaxResultsPerPage = maxResultsPerPage;
            }
            
            if (financialEventGroupStartedAfter) {
              queryParams.FinancialEventGroupStartedAfter = financialEventGroupStartedAfter;
            }
            
            if (financialEventGroupStartedBefore) {
              queryParams.FinancialEventGroupStartedBefore = financialEventGroupStartedBefore;
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/finances/v0/financialEventGroups',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error listing financial event groups: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Lists financial event groups"
      },
      
      listFinancialEvents: {
        schema: {
          maxResultsPerPage: z.number().int().optional().describe("The maximum number of results to return per page"),
          postedAfter: z.string().optional().describe("A date used for selecting financial events posted after (or at) a specified date and time"),
          postedBefore: z.string().optional().describe("A date used for selecting financial events posted before (or at) a specified date and time")
        },
        handler: async ({ maxResultsPerPage, postedAfter, postedBefore }) => {
          try {
            const queryParams = {};
            
            if (maxResultsPerPage) {
              queryParams.MaxResultsPerPage = maxResultsPerPage;
            }
            
            if (postedAfter) {
              queryParams.PostedAfter = postedAfter;
            }
            
            if (postedBefore) {
              queryParams.PostedBefore = postedBefore;
            }
            
            const data = await makeSpApiRequest(
              'GET',
              '/finances/v0/financialEvents',
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error listing financial events: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Lists financial events"
      },
      
      getFinancialEventGroup: {
        schema: {
          eventGroupId: z.string().describe("The identifier of the financial event group to which the events belong")
        },
        handler: async ({ eventGroupId }) => {
          try {
            const data = await makeSpApiRequest(
              'GET',
              `/finances/v0/financialEventGroups/${eventGroupId}/financialEvents`
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting financial event group: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns all financial events for the specified financial event group"
      }
    };
