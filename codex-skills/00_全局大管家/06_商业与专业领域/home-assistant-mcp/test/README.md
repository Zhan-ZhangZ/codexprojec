# Home Assistant API Client Tests

This directory contains tests for the Home Assistant API client. The tests are designed to run against a real Home Assistant instance to validate the client's functionality.

## Integration Tests

The integration tests in `hass-client.test.ts` connect to a live Home Assistant instance to test all API functionality. These tests validate that:

1. The client can connect to Home Assistant
2. All API endpoints behave as expected
3. Error handling works correctly
4. The type system correctly matches the real API responses

## Setup

### Prerequisites

- A running Home Assistant instance
- A long-lived access token with appropriate permissions

### Configuration

Create or modify the `.env` file in the project root with the following variables:

```
HASS_URL=http://your-home-assistant-instance:8123/api
HASS_TOKEN=your_long_lived_access_token
```

To create a long-lived access token in Home Assistant:

1. Go to your Home Assistant profile page
2. Scroll to the bottom to the "Long-Lived Access Tokens" section
3. Click "Create Token"
4. Give it a name like "API Client Tests"
5. Copy the token to your `.env` file

## Running Tests

Run the tests with Bun:

```bash
bun test
```

Or run just the Home Assistant client tests:

```bash
bun test hass-client
```

### Watch Mode

To run tests in watch mode (useful during development):

```bash
bun test --watch
```

## Test Design

The tests are designed to:

1. **Be non-destructive** - Even when testing service calls like controlling lights, they restore the original state after the test.
2. **Work with any Home Assistant setup** - Tests that require specific entities (like lights) are skipped if those entities aren't available.
3. **Provide helpful error messages** - Tests include detailed error reporting to simplify debugging.
4. **Handle permissions gracefully** - Some tests may be skipped based on the permissions of your token.

## Adding New Tests

When adding new tests:

1. Always restore any state changes you make
2. Make tests conditional based on available entities when necessary
3. Use descriptive test names to make failures easy to understand
4. Group related tests together using `describe` blocks

Remember to run the tests with `bun test` after making changes to verify they work correctly.
