import { FileKiCadClient, type IKiCadClient } from '@spark-apps/kicad-client';

/**
 * KiCad service for MCP tools
 * Provides a singleton instance of the KiCad client
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class KiCadService {
  private static client: IKiCadClient | null = null;

  /**
   * Get or create the KiCad client instance
   */
  static getClient(): IKiCadClient {
    this.client ??= new FileKiCadClient();
    return this.client;
  }

  /**
   * Ensure the client is connected
   */
  static async ensureConnected(): Promise<void> {
    const client = this.getClient();
    if (!client.isConnected()) {
      await client.connect();
    }
  }

  /**
   * Disconnect the client
   */
  static async disconnect(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.disconnect();
    }
  }

  /**
   * Reset the client (useful for testing)
   */
  static reset(): void {
    this.client = null;
  }
}
