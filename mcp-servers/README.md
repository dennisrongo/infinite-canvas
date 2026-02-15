# Playwright MCP Server Setup

This directory contains the MCP server configuration for the Playwright MCP server.

## Configuration

The configuration file `cline_mcp_settings.json` contains the following settings:

```json
{
  "mcpServers": {
    "github.com/microsoft/playwright-mcp": {
      "type": "stdio",
      "command": "npx",
      "timeout": 30,
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--headless"
      ],
      "disabled": false
    }
  }
}
```

## How to Use

To use this MCP server with Cline/Windsurf, you need to:

1. Copy the `cline_mcp_settings.json` file to your Cline settings directory:
   - macOS: `~/Library/Application Support/cline/`
   - Or use Cline's built-in MCP settings management

2. Restart Cline/Windsurf to load the new MCP server

## Available Tools

The Playwright MCP server provides 24 browser automation tools:

- **Navigation**: `browser_navigate`, `browser_navigate_back`
- **Interaction**: `browser_click`, `browser_type`, `browser_hover`, `browser_drag`
- **Forms**: `browser_fill_form`, `browser_select_option`, `browser_file_upload`
- **Screenshots**: `browser_take_screenshot`, `browser_snapshot`
- **Browser Control**: `browser_resize`, `browser_close`, `browser_tabs`
- **JavaScript**: `browser_evaluate`, `browser_run_code`
- **Network**: `browser_network_requests`
- **Console**: `browser_console_messages`
- **Dialogs**: `browser_handle_dialog`
- **Keyboard**: `browser_press_key`
- **Waiting**: `browser_wait_for`
- **Browser Install**: `browser_install`

## Browser Installation

The Playwright browsers have been installed to:
- `~/Library/Caches/ms-playwright/chromium-1208`
- `~/Library/Caches/ms-playwright/chromium_headless_shell-1208`

## Documentation

For more information, see:
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [Playwright Documentation](https://playwright.dev)
