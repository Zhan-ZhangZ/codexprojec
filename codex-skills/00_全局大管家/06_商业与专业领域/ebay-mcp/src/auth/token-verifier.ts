/**
 * Token verification using OAuth 2.0 Token Introspection (RFC 7662)
 * and JWT validation
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getErrorMessage } from '@/utils/errors.js';
import { describeHttpError, httpRequest, isHttpError } from '@/utils/http.js';
import type {
  VerifiedToken,
  TokenIntrospectionRequest,
  TokenIntrospectionResponse,
  OAuthServerMetadata,
} from './oauth-types.js';

/**
 * OAuth issuer and audience settings used to validate MCP access tokens.
 */
export interface TokenVerifierConfig {
  /**
   * OAuth authorization server metadata URL or metadata object
   */
  authServerMetadata: string | OAuthServerMetadata;

  /**
   * Client ID for introspection endpoint authentication
   */
  clientId?: string;

  /**
   * Client secret for introspection endpoint authentication
   */
  clientSecret?: string;

  /**
   * Expected audience (resource server URL)
   */
  expectedAudience: string;

  /**
   * Required scopes for access
   */
  requiredScopes?: string[];

  /**
   * Whether to use token introspection (true) or JWT validation (false)
   * Default: true
   */
  useIntrospection?: boolean;
}

/**
 * Verifies MCP Bearer tokens using OAuth introspection or JWT validation.
 */
export class TokenVerifier {
  private config: TokenVerifierConfig;
  private metadata: OAuthServerMetadata | null = null;

  constructor(config: TokenVerifierConfig) {
    this.config = config;
  }

  /**
   * Initialize the verifier by loading OAuth server metadata
   */
  async initialize(): Promise<void> {
    if (typeof this.config.authServerMetadata === 'string') {
      try {
        const response = await httpRequest<OAuthServerMetadata>({
          url: this.config.authServerMetadata,
        });
        this.metadata = response.data;
      } catch (error) {
        throw new Error(`Failed to load OAuth server metadata: ${getErrorMessage(error)}`);
      }
    } else {
      this.metadata = this.config.authServerMetadata;
    }
  }

  /**
   * Verify an access token
   */
  async verifyToken(token: string): Promise<VerifiedToken> {
    if (!this.metadata) {
      throw new Error('Token verifier not initialized');
    }

    if (this.config.useIntrospection !== false) {
      return await this.verifyViaIntrospection(token);
    } else {
      return await this.verifyViaJWT(token);
    }
  }

  /**
   * Verify token using OAuth 2.0 Token Introspection (RFC 7662)
   */
  private async verifyViaIntrospection(token: string): Promise<VerifiedToken> {
    if (!this.metadata) {
      throw new Error('Token verifier not initialized');
    }

    // Check if introspection endpoint is available
    const introspectionEndpoint = this.metadata.introspection_endpoint;
    if (!introspectionEndpoint) {
      throw new Error('Introspection endpoint not available in OAuth server metadata');
    }

    // Prepare introspection request
    const requestData: TokenIntrospectionRequest = {
      token,
      token_type_hint: 'access_token',
    };

    // Add client credentials if provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const params = new URLSearchParams({
      token: requestData.token,
    });

    if (this.config.clientId) {
      params.set('client_id', this.config.clientId);
    }

    if (this.config.clientSecret) {
      params.set('client_secret', this.config.clientSecret);
    }

    // Make introspection request
    try {
      const response = await httpRequest<TokenIntrospectionResponse>({
        method: 'POST',
        url: introspectionEndpoint,
        body: params,
        headers,
      });

      const data = response.data;

      // Check if token is active
      if (!data.active) {
        throw new Error('Token is not active');
      }

      // Validate audience
      if (!this.validateAudience(data.aud)) {
        throw new Error(
          `Invalid audience. Expected: ${this.config.expectedAudience}, Got: ${data.aud}`
        );
      }

      // Validate scopes
      const scopes = data.scope ? data.scope.split(' ') : [];
      if (this.config.requiredScopes) {
        const hasRequiredScopes = this.config.requiredScopes.every((scope) =>
          scopes.includes(scope)
        );
        if (!hasRequiredScopes) {
          throw new Error(
            `Missing required scopes. Required: ${this.config.requiredScopes.join(', ')}, Got: ${scopes.join(', ')}`
          );
        }
      }

      return {
        token,
        clientId: data.client_id || 'unknown',
        scopes,
        expiresAt: data.exp,
        audience: data.aud,
        subject: data.sub,
      };
    } catch (error) {
      if (isHttpError(error)) {
        throw new Error(`Token introspection failed: ${describeHttpError(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify token using JWT validation
   */
  private async verifyViaJWT(token: string): Promise<VerifiedToken> {
    if (!this.metadata) {
      throw new Error('Token verifier not initialized');
    }

    if (!this.metadata.jwks_uri) {
      throw new Error('JWKS URI not available in OAuth server metadata');
    }

    try {
      // Get JWKS from authorization server
      const JWKS = createRemoteJWKSet(new URL(this.metadata.jwks_uri));

      // Verify JWT
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: this.metadata.issuer,
        audience: this.config.expectedAudience,
      });

      // Extract scopes
      const scopes =
        typeof payload.scope === 'string'
          ? payload.scope.split(' ')
          : Array.isArray(payload.scope)
            ? payload.scope
            : [];

      // Validate required scopes
      if (this.config.requiredScopes) {
        const hasRequiredScopes = this.config.requiredScopes.every((scope) =>
          scopes.includes(scope)
        );
        if (!hasRequiredScopes) {
          throw new Error(
            `Missing required scopes. Required: ${this.config.requiredScopes.join(', ')}, Got: ${scopes.join(', ')}`
          );
        }
      }

      const clientId =
        typeof payload.client_id === 'string'
          ? payload.client_id
          : typeof payload.azp === 'string'
            ? payload.azp
            : 'unknown';

      return {
        token,
        clientId,
        scopes,
        expiresAt: payload.exp,
        audience: payload.aud,
        subject: payload.sub,
      };
    } catch (error) {
      throw new Error(`JWT verification failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Validate audience claim
   */
  private validateAudience(audience: string | string[] | undefined): boolean {
    if (!audience) {
      return false;
    }

    const audiences = Array.isArray(audience) ? audience : [audience];
    const normalizedExpected = this.config.expectedAudience.replace(/\/$/, '');

    return audiences.some((aud) => {
      const normalizedAud = aud.replace(/\/$/, '');
      return (
        normalizedAud === normalizedExpected ||
        normalizedAud === normalizedExpected + '/' ||
        normalizedExpected === normalizedAud + '/'
      );
    });
  }
}
