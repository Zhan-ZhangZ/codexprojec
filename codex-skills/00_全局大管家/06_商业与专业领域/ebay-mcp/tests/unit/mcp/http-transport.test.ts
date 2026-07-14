import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  createHttpMcpApp,
  createHttpTransportConfigFromEnv,
  getAuthServerMetadataUrl,
  getHttpServerUrl,
  type HttpTransportConfig,
} from '@/mcp/http-transport.js';

function createTestConfig(overrides: Partial<HttpTransportConfig> = {}): HttpTransportConfig {
  return {
    authEnabled: false,
    ebayConfig: {
      clientId: 'client',
      clientSecret: 'secret',
      environment: 'sandbox',
    },
    host: '127.0.0.1',
    oauth: {
      authServerUrl: 'http://localhost:8080/realms/master',
      requiredScopes: ['mcp:tools'],
      useIntrospection: true,
    },
    port: 3000,
    projectRoot: process.cwd(),
    ...overrides,
  };
}

describe('HTTP MCP transport', () => {
  it('builds HTTP server and metadata URLs from config', () => {
    const config = createTestConfig();

    expect(getHttpServerUrl(config)).toBe('http://127.0.0.1:3000');
    expect(getAuthServerMetadataUrl(config)).toBe(
      'http://localhost:8080/realms/master/.well-known/openid-configuration'
    );

    expect(
      getAuthServerMetadataUrl({
        oauth: {
          ...config.oauth,
          authServerUrl: 'https://auth.example.test',
        },
      })
    ).toBe('https://auth.example.test/.well-known/oauth-authorization-server');
  });

  it('creates config from env defaults and overrides', () => {
    const config = createHttpTransportConfigFromEnv({
      MCP_HOST: '0.0.0.0',
      MCP_PORT: '4444',
      OAUTH_ENABLED: 'false',
      OAUTH_REQUIRED_SCOPES: 'mcp:tools,mcp:admin',
    });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(4444);
    expect(config.authEnabled).toBe(false);
    expect(config.oauth.requiredScopes).toEqual(['mcp:tools', 'mcp:admin']);
  });

  it('keeps health available without OAuth', async () => {
    const app = await createHttpMcpApp(createTestConfig());
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      oauth_enabled: false,
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('rejects session requests without a valid MCP session id', async () => {
    const app = await createHttpMcpApp(createTestConfig());
    const response = await request(app).get('/');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'invalid_session',
      error_description: 'Invalid or missing session ID',
    });
  });
});
