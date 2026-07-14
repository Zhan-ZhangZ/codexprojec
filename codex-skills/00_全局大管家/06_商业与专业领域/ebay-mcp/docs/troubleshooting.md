# Troubleshooting

Run `npm run diagnose` first — it checks most of the issues below automatically.

## Common issues

### Server not appearing in your MCP client

The eBay MCP server doesn't show up in Claude Desktop (or another client).

1. Verify the config file path is correct for your OS (see the [client compatibility table](../README.md#mcp-client-compatibility)).
2. Check the JSON syntax is valid.
3. Ensure environment variables are set.
4. Restart the client completely.
5. Check the client's logs for error messages.

### Authentication errors

"Invalid credentials" or "Authentication failed".

1. Verify `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` are correct.
2. Confirm you're using the right environment (sandbox vs production).
3. Check your app keys are active in the [eBay Developer Portal](https://developer.ebay.com/my/keys).
4. For user tokens, verify `EBAY_USER_REFRESH_TOKEN` is valid.
5. Run `npm run diagnose`.

### Rate limit errors

"Rate limit exceeded" (HTTP 429).

1. Upgrade to user-token authentication (10k–50k requests/day vs the default 1k).
2. Throttle your usage; the server retries with exponential backoff.
3. Check your current limit in the [Developer Portal](https://developer.ebay.com/my/api_usage).
4. Consider upgrading your eBay Developer account tier.

### Tools return errors or empty results

1. Verify the correct environment (sandbox vs production).
2. Ensure you have the right scopes/permissions for the operation.
3. Check API health with the `ebay_get_api_status` tool or the [eBay API Status](https://developer.ebay.com/support/api-status) page.
4. Run `npm run diagnose`.
5. Review the [eBay API docs](https://developer.ebay.com/docs) for the endpoint's requirements.

## Diagnostics

```bash
npm run diagnose          # Interactive diagnostics
npm run diagnose:export   # Export a diagnostic report
```

The diagnostic tool checks environment variable configuration, eBay API connectivity, authentication status, token validity, and available scopes/permissions.

## Getting help

If you're still stuck, [open an issue](https://github.com/YosefHayim/ebay-mcp/issues) with:

- Your diagnostic report (`npm run diagnose:export`)
- Steps to reproduce
- Error messages or logs
- Your environment (OS, Node version, MCP client)
