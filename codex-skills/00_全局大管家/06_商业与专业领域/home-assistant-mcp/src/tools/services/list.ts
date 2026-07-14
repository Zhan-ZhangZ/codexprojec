import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import type { HassClient } from "../../api/client.js";
import type { HassServices } from "../../types/services/service.types.js";

// Define type for simplified service field
type SimplifiedServiceField = {
  name: string;
  description: string;
  required?: boolean;
  example?: string;
};

// Define type for simplified service info
type SimplifiedServiceInfo = {
  domain: string;
  service: string;
  description: string;
  fields: SimplifiedServiceField[];
  example?: string;
  documentation_url?: string;
};

/**
 * Register services list tool with the MCP server
 * @param server The MCP server to register the tools with
 */
export function registerServicesListTool(
  server: McpServer,
  hassClient: HassClient,
) {
  server.tool(
    "tools-services-list",
    "Get all available services in Home Assistant with detailed information about parameters and usage",
    {
      domain: z
        .string()
        .optional()
        .describe("Optional domain to filter services by (e.g., 'light', 'switch', 'cover')"),
      service: z
        .string()
        .optional()
        .describe("Optional service name to filter by (e.g., 'turn_on', 'toggle')"),
      search: z
        .string()
        .optional()
        .describe("Optional search term to find services by description or name"),
      simplified: z
        .boolean()
        .optional()
        .default(true)
        .describe("Return simplified service data structure with better formatting (recommended)"),
      include_examples: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include example usage for services"),
      format: z
        .enum(["json", "markdown"])
        .optional()
        .default("markdown")
        .describe("Output format (markdown for readable tables, json for raw data)"),
    },
    async (params) => {
      try {
        apiLogger.warn("Executing services list tool", {
          domain: params.domain,
          service: params.service,
          search: params.search,
          simplified: params.simplified,
          include_examples: params.include_examples,
          format: params.format,
        });

        // Use the HassClient's getServices method
        const services = await hassClient.getServices(params.domain);

        // Filter and format the services based on parameters
        const processedServices = processServices(
          services,
          params.simplified ?? true,
          params.service,
          params.search,
          params.include_examples ?? true
        );

        // Format the output according to the specified format
        const formattedOutput = formatOutput(
          processedServices,
          params.format ?? "markdown",
          params.simplified ?? true
        );

        return {
          content: [
            {
              type: "text",
              text: formattedOutput,
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-services-list", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting services: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}

/**
 * Process services data based on parameters
 */
function processServices(
  services: HassServices,
  simplified: boolean,
  serviceFilter?: string,
  searchTerm?: string,
  includeExamples = true
): SimplifiedServiceInfo[] | HassServices {
  // If not using simplified format, just filter by service if needed
  if (!simplified) {
    if (!serviceFilter) {
      return services;
    }

    // Filter domains by service name
    const filteredServices: HassServices = {};
    for (const domain in services) {
      if (services[domain][serviceFilter]) {
        filteredServices[domain] = {
          [serviceFilter]: services[domain][serviceFilter]
        };
      }
    }

    return filteredServices;
  }

  // For simplified format, transform the data structure
  const simplifiedServices: SimplifiedServiceInfo[] = [];

  // Process each domain and service
  for (const domain in services) {
    const domainServices = services[domain];

    for (const serviceName in domainServices) {
      // Skip if we're filtering by service name and this doesn't match
      if (serviceFilter && serviceName !== serviceFilter) {
        continue;
      }

      const serviceDetail = domainServices[serviceName];

      // Skip if we're searching and neither name nor description matches
      if (searchTerm &&
          !serviceName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !serviceDetail.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        continue;
      }

      // Format fields
      const fields = serviceDetail.fields ?
        Object.entries(serviceDetail.fields).map(([fieldName, fieldInfo]) => ({
          name: fieldName,
          description: fieldInfo.description || "No description available",
          required: fieldInfo.required || false,
          example: fieldInfo.example !== undefined ?
            typeof fieldInfo.example === 'object' ?
              JSON.stringify(fieldInfo.example) :
              String(fieldInfo.example)
            : undefined
        })) : [];

      // Create example based on fields
      let example = undefined;
      if (includeExamples && fields.length > 0) {
        const exampleData: Record<string, unknown> = {};
        fields.forEach(field => {
          if (field.example !== undefined) {
            try {
              // Try to parse the example as JSON if possible
              exampleData[field.name] = JSON.parse(field.example);
            } catch {
              // Otherwise use the string value
              exampleData[field.name] = field.example;
            }
          } else if (field.required) {
            // Add placeholder for required fields
            exampleData[field.name] = `<${field.name}>`;
          }
        });

        // Add entity_id if it's a common service that uses it
        if (!exampleData.entity_id &&
            ["turn_on", "turn_off", "toggle", "set", "update"].includes(serviceName)) {
          exampleData.entity_id = `${domain}.device_name`;
        }

        if (Object.keys(exampleData).length > 0) {
          example = `service: ${domain}.${serviceName}\n` +
                    `data:\n` +
                    Object.entries(exampleData)
                      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
                      .join('\n');
        }
      }

      // Create documentation URL
      const documentationUrl = `https://www.home-assistant.io/integrations/${domain}/`;

      simplifiedServices.push({
        domain,
        service: serviceName,
        description: serviceDetail.description || "No description available",
        fields,
        ...(example ? { example } : {}),
        documentation_url: documentationUrl
      });
    }
  }

  return simplifiedServices;
}

/**
 * Format the output based on the specified format
 */
function formatOutput(
  services: SimplifiedServiceInfo[] | HassServices,
  format: "json" | "markdown",
  simplified: boolean
): string {
  if (format === "json") {
    return JSON.stringify(services, null, 2);
  }

  // For markdown format
  if (!simplified || !Array.isArray(services)) {
    // If not simplified, just return the stringified JSON
    return '```json\n' + JSON.stringify(services, null, 2) + '\n```';
  }

  // Start the markdown output
  let markdown = '# Home Assistant Services\n\n';

  // Group services by domain
  const servicesByDomain: Record<string, SimplifiedServiceInfo[]> = {};
  for (const service of services as SimplifiedServiceInfo[]) {
    if (!servicesByDomain[service.domain]) {
      servicesByDomain[service.domain] = [];
    }
    servicesByDomain[service.domain].push(service);
  }

  // Generate a table of contents
  markdown += '## Table of Contents\n\n';
  for (const domain in servicesByDomain) {
    markdown += `- [${domain}](#${domain})\n`;
  }

  markdown += '\n';

  // For each domain, create a section with tables for all services
  for (const domain in servicesByDomain) {
    markdown += `## ${domain}\n\n`;
    markdown += `[Documentation](https://www.home-assistant.io/integrations/${domain}/)\n\n`;

    const domainServices = servicesByDomain[domain];

    for (const service of domainServices) {
      markdown += `### ${service.service}\n\n`;
      markdown += `${service.description}\n\n`;

      // Create table for fields
      if (service.fields.length > 0) {
        markdown += '**Parameters:**\n\n';
        markdown += '| Name | Description | Required | Example |\n';
        markdown += '| ---- | ----------- | -------- | ------- |\n';

        for (const field of service.fields) {
          markdown += `| \`${field.name}\` | ${field.description} | ${field.required ? 'Yes' : 'No'} | ${field.example || '-'} |\n`;
        }

        markdown += '\n';
      }

      // Add example if available
      if (service.example) {
        markdown += '**Example:**\n\n';
        markdown += '```yaml\n' + service.example + '\n```\n\n';
      }
    }
  }

  // If no services found
  if (Object.keys(servicesByDomain).length === 0) {
    markdown += 'No services found matching your criteria.\n';
  }

  return markdown;
}
