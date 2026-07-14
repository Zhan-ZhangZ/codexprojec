/**
 * eBay API MCP Server with HTTP Transport and OAuth 2.1 Authorization.
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { validateEnvironmentConfig } from '@/config/environment.js';
import {
  createHttpMcpApp,
  createHttpTransportConfigFromEnv,
  getHttpServerUrl,
} from '@/mcp/http-transport.js';

const CONFIG = createHttpTransportConfigFromEnv();

function logEnvironmentValidation(): void {
  const validation = validateEnvironmentConfig();

  validation.infos.forEach((info) => {
    console.log(`  ℹ ${info}`);
  });

  if (validation.warnings.length > 0) {
    console.log('Environment Configuration Warnings:');
    validation.warnings.forEach((warning) => {
      console.log(`  • ${warning}`);
    });
    console.log();
  }

  if (!validation.isValid) {
    console.error('Environment Configuration Errors:');
    validation.errors.forEach((error) => {
      console.error(`  • ${error}`);
    });
    console.error('\nPlease fix the configuration errors and restart the server.\n');
    process.exit(1);
  }
}

function logConfiguration(): void {
  console.log('Configuration:');
  console.log(`Host: ${CONFIG.host}`);
  console.log(`Port: ${CONFIG.port}`);
  console.log(`OAuth Enabled: ${CONFIG.authEnabled}`);

  if (CONFIG.authEnabled) {
    console.log(`Auth Server: ${CONFIG.oauth.authServerUrl}`);
    console.log(`Required Scopes: ${CONFIG.oauth.requiredScopes.join(', ')}`);
    console.log(`Verification Method: ${CONFIG.oauth.useIntrospection ? 'Introspection' : 'JWT'}`);
  }
}

function logStartupUrls(serverUrl: string): void {
  console.log('Server is running!');
  console.log();
  console.log(`MCP endpoint: ${serverUrl}/`);
  console.log(`Protected Resource Metadata: ${serverUrl}/.well-known/oauth-protected-resource`);
  console.log(`Health check: ${serverUrl}/health`);
  console.log();

  if (CONFIG.authEnabled) {
    console.log('Authorization is ENABLED');
    console.log('Clients must provide valid Bearer tokens to access MCP endpoints');
  } else {
    console.log('Authorization is DISABLED');
    console.log(
      'Set OAUTH_ENABLED=true (or remove OAUTH_ENABLED=false) to enable OAuth protection'
    );
  }
}

async function main(): Promise<void> {
  try {
    console.log('Starting eBay API MCP Server (HTTP + OAuth)...');
    console.log();

    logEnvironmentValidation();
    logConfiguration();

    const app = await createHttpMcpApp(CONFIG);
    const serverUrl = getHttpServerUrl(CONFIG);
    const server = app.listen(CONFIG.port, CONFIG.host, () => {
      logStartupUrls(serverUrl);
    });

    process.on('SIGINT', () => {
      console.log('\n Shutting down...');
      server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
const modulePath = resolve(fileURLToPath(import.meta.url));
if (entryPath && modulePath === entryPath) {
  await main();
}
