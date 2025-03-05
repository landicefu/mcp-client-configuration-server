# MCP Client Configuration Server

## Overview

This MCP server helps manage configurations for different MCP clients. It provides tools to retrieve, list, add, and remove server configurations from client configuration files. The server automatically detects the appropriate configuration file path based on the operating system (Windows or macOS) and the specified client.

## Supported Clients

- **Cline**: Claude-powered coding assistant
- **Roo Code**: Code editor with AI capabilities
- **WindSurf**: AI-powered browser
- **Cursor**: AI-powered code editor
- **Claude app**: Desktop application for Claude AI

## Tools

### get_configuration_path

Retrieves the path to the configuration file for a specified client.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)

**Returns:**
- The absolute path to the configuration file

### get_configuration

Retrieves the entire configuration for a specified client.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)

**Returns:**
- The complete JSON configuration from the client's configuration file

### list_servers

Lists all server names configured in a specified client's configuration.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)

**Returns:**
- An array of server names

### get_server_configuration

Retrieves the configuration for a specific server from a client's configuration.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)
- `server_name` (required): The name of the server to retrieve

**Returns:**
- The JSON configuration for the specified server

### add_server_configuration

Adds or updates a server configuration in a client's configuration file.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)
- `server_name` (required): The name of the server to add or update
- `json_config` (required): The server configuration in JSON format

**Example:**
```json
{
  "command": "npx",
  "args": ["-y", "@landicefu/android-adb-mcp-server"],
  "env": {},
  "disabled": false,
  "alwaysAllow": []
}
```

**Returns:**
- A success message with the updated configuration

### remove_server_configuration

Removes a server configuration from a client's configuration file.

**Parameters:**
- `client` (required): The client name (cline, roo_code, windsurf, cursor, claude)
- `server_name` (required): The name of the server to remove

**Returns:**
- The removed configuration or a message that the server was not found

## Implementation Details

- The server detects the appropriate configuration file path based on the operating system (Windows or macOS) and the specified client.
- All configuration files are maintained in a beautified JSON format after modifications.
- Error handling is provided for cases where configuration files don't exist or cannot be accessed.
