import cors from 'cors';
import { randomUUID } from 'crypto';
import express, { type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, type Implementation } from '@modelcontextprotocol/sdk/types.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createBearerAuthMiddleware } from '@/auth/oauth-middleware.js';
import { createMetadataRouter, getProtectedResourceMetadataUrl } from '@/auth/oauth-metadata.js';
import { TokenVerifier } from '@/auth/token-verifier.js';
import { getDefaultScopes, getEbayConfig } from '@/config/environment.js';
import { createEbayMcpRuntime } from '@/mcp/runtime.js';
import type { EbayConfig } from '@/types/ebay.js';
import { getErrorMessage } from '@/utils/errors.js';
import { getVersion } from '@/utils/version.js';

/**
 * OAuth settings for protecting the HTTP MCP transport.
 */
export interface HttpOAuthConfig {
  authServerUrl: string;
  clientId?: string;
  clientSecret?: string;
  requiredScopes: string[];
  useIntrospection: boolean;
}

/**
 * Runtime configuration for the Express-based HTTP MCP server.
 */
export interface HttpTransportConfig {
  authEnabled: boolean;
  ebayConfig?: EbayConfig;
  host: string;
  oauth: HttpOAuthConfig;
  port: number;
  projectRoot: string;
}

function getProjectRoot(): string {
  const filename = fileURLToPath(import.meta.url);
  const directory = dirname(filename);
  return join(directory, '../..');
}

/**
 * Build HTTP transport configuration from process environment variables.
 */
export function createHttpTransportConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): HttpTransportConfig {
  return {
    host: env.MCP_HOST || 'localhost',
    port: Number(env.MCP_PORT) || 3000,
    oauth: {
      authServerUrl: env.OAUTH_AUTH_SERVER_URL ?? 'http://localhost:8080/realms/master',
      clientId: env.OAUTH_CLIENT_ID,
      clientSecret: env.OAUTH_CLIENT_SECRET,
      requiredScopes: (env.OAUTH_REQUIRED_SCOPES || 'mcp:tools')
        .split(',')
        .map((scope) => scope.trim()),
      useIntrospection: env.OAUTH_USE_INTROSPECTION !== 'false',
    },
    authEnabled: env.OAUTH_ENABLED !== 'false',
    projectRoot: getProjectRoot(),
  };
}

/**
 * Build the public server URL used for MCP metadata and OAuth audience checks.
 */
export function getHttpServerUrl(config: Pick<HttpTransportConfig, 'host' | 'port'>): string {
  return `http://${config.host}:${config.port}`;
}

/**
 * Resolve the OAuth authorization-server metadata endpoint for the configured issuer.
 */
export function getAuthServerMetadataUrl(config: Pick<HttpTransportConfig, 'oauth'>): string {
  const baseUrl = config.oauth.authServerUrl;

  if (baseUrl.includes('/realms/')) {
    return `${baseUrl}/.well-known/openid-configuration`;
  }

  return `${baseUrl}/.well-known/oauth-authorization-server`;
}

function createServerConfig(serverUrl: string): Implementation {
  const iconBaseUrl = `${serverUrl}/icons`;
  const iconSizes = ['16x16', '32x32', '48x48', '128x128', '256x256', '512x512', '1024x1024'];

  return {
    name: 'ebay-mcp',
    version: getVersion(),
    title: 'eBay API MCP Server',
    websiteUrl: 'https://github.com/YosefHayim/ebay-mcp',
    icons: iconSizes.map((size) => ({
      src: `${iconBaseUrl}/${size}.png`,
      mimeType: 'image/png',
      sizes: [size],
    })),
  };
}

async function createMcpServer(serverUrl: string): Promise<McpServer> {
  const runtime = createEbayMcpRuntime({
    serverConfig: createServerConfig(serverUrl),
  });

  try {
    await runtime.initializeApi();
  } catch (error) {
    const message = getErrorMessage(error, String(error));
    console.error(`Failed to initialize eBay API client: ${message}`);
    throw error;
  }

  return runtime.server;
}

async function createAuthMiddleware(
  config: HttpTransportConfig,
  serverUrl: string
): Promise<RequestHandler | undefined> {
  if (!config.authEnabled) {
    console.error('OAuth is disabled. Server running in unauthenticated mode.');
    return undefined;
  }

  console.log('Initializing OAuth token verifier...');

  const tokenVerifier = new TokenVerifier({
    authServerMetadata: getAuthServerMetadataUrl(config),
    clientId: config.oauth.clientId,
    clientSecret: config.oauth.clientSecret,
    expectedAudience: serverUrl,
    requiredScopes: config.oauth.requiredScopes,
    useIntrospection: config.oauth.useIntrospection,
  });

  try {
    await tokenVerifier.initialize();
    console.log('Token verifier initialized');

    return createBearerAuthMiddleware({
      verifier: tokenVerifier,
      resourceMetadataUrl: getProtectedResourceMetadataUrl(serverUrl),
      realm: 'ebay-mcp',
    });
  } catch (error) {
    console.error('Failed to initialize token verifier:', error);
    throw error;
  }
}

function createRequestLogger(): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  };
}

function sendInvalidSession(res: Response): void {
  res.status(400).json({
    error: 'invalid_session',
    error_description: 'Invalid or missing session ID',
  });
}

/**
 * Create the Express app that serves OAuth metadata and streamable HTTP MCP sessions.
 */
export async function createHttpMcpApp(config: HttpTransportConfig): Promise<express.Application> {
  const app = express();
  const serverUrl = getHttpServerUrl(config);
  const ebayConfig = config.ebayConfig ?? getEbayConfig();

  app.use(
    cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
    })
  );
  app.use(express.json());
  app.use(helmet({ xPoweredBy: false }));
  app.use(createRequestLogger());
  app.use('/icons', express.static(join(config.projectRoot, 'public', 'icons')));

  app.use(
    createMetadataRouter({
      resourceServerUrl: serverUrl,
      authServerMetadata: getAuthServerMetadataUrl(config),
      scopesSupported: config.oauth.requiredScopes,
      resourceDocumentation: 'https://github.com/YosefHayim/ebay-mcp',
      resourceName: 'eBay API MCP Server',
      ebayEnvironment: ebayConfig.environment,
      ebayScopes: getDefaultScopes(ebayConfig.environment),
    })
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      oauth_enabled: config.authEnabled,
    });
  });

  const authMiddleware = await createAuthMiddleware(config, serverUrl);
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const mcpPostHandler = async (req: Request, res: Response): Promise<void> => {
    const sessionHeader = req.headers['mcp-session-id'];
    const sessionId = typeof sessionHeader === 'string' ? sessionHeader : undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          transports.set(initializedSessionId, transport);
          console.log(`New MCP session initialized: ${initializedSessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          console.log(`MCP session closed: ${transport.sessionId}`);
        }
      };

      const server = await createMcpServer(serverUrl);
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  };

  const handleSessionRequest = async (req: Request, res: Response): Promise<void> => {
    const sessionHeader = req.headers['mcp-session-id'];
    const sessionId = typeof sessionHeader === 'string' ? sessionHeader : undefined;

    if (!sessionId || !transports.has(sessionId)) {
      sendInvalidSession(res);
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  };

  const mcpMiddleware = authMiddleware ? [authMiddleware, mcpPostHandler] : [mcpPostHandler];
  const sessionMiddleware = authMiddleware
    ? [authMiddleware, handleSessionRequest]
    : [handleSessionRequest];

  app.post('/', ...mcpMiddleware);
  app.get('/', ...sessionMiddleware);
  app.delete('/', ...sessionMiddleware);

  return app;
}
