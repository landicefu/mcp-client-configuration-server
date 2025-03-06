#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Supported client types
type ClientType = 'cline' | 'roo_code' | 'windsurf' | 'cursor' | 'claude';

// Configuration paths for different clients on different platforms
const getConfigPath = (client: ClientType): string => {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  if (platform === 'win32') {
    // Windows paths
    switch (client) {
      case 'cline':
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      case 'roo_code':
        return path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');
      case 'windsurf':
        return path.join(homeDir, 'AppData', 'Roaming', 'WindSurf', 'mcp_settings.json');
      case 'cursor':
        return path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'mcp_settings.json');
      case 'claude':
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported client: ${client}`);
    }
  } else if (platform === 'darwin') {
    // macOS paths
    switch (client) {
      case 'cline':
        return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      case 'roo_code':
        return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json');
      case 'windsurf':
        return path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
      case 'cursor':
        return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'mcp_settings.json');
      case 'claude':
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported client: ${client}`);
    }
  } else {
    throw new McpError(ErrorCode.InternalError, `Unsupported platform: ${platform}`);
  }
};

// Validate client parameter
const validateClient = (client: unknown): ClientType => {
  if (typeof client !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Client must be a string');
  }
  
  const validClients: ClientType[] = ['cline', 'roo_code', 'windsurf', 'cursor', 'claude'];
  if (!validClients.includes(client as ClientType)) {
    throw new McpError(ErrorCode.InvalidParams, `Invalid client: ${client}. Must be one of: ${validClients.join(', ')}`);
  }
  
  return client as ClientType;
};

// Read configuration file
const readConfigFile = async (configPath: string): Promise<any> => {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new McpError(ErrorCode.InternalError, `Configuration file not found: ${configPath}`);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Error reading configuration file: ${errorMessage}`);
  }
};

// Write configuration file
const writeConfigFile = async (configPath: string, config: any): Promise<void> => {
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(configPath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write the file with pretty formatting
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Error writing configuration file: ${errorMessage}`);
  }
};

class ConfigurationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-client-configuration-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error: unknown) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_configuration_path',
          description: 'Get the path to the configuration file for a specific client',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
            },
            required: ['client'],
          },
        },
        {
          name: 'get_configuration',
          description: 'Get the entire configuration for a specific client',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
            },
            required: ['client'],
          },
        },
        {
          name: 'list_servers',
          description: 'List all server names configured in a specific client',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
            },
            required: ['client'],
          },
        },
        {
          name: 'get_server_configuration',
          description: 'Get the configuration for a specific server from a client configuration',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
              server_name: {
                type: 'string',
                description: 'Name of the server to retrieve',
              },
            },
            required: ['client', 'server_name'],
          },
        },
        {
          name: 'add_server_configuration',
          description: 'Add or update a server configuration in a client configuration',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
              server_name: {
                type: 'string',
                description: 'Name of the server to add or update',
              },
              json_config: {
                type: 'object',
                description: 'Server configuration in JSON format',
              },
              allow_override: {
                type: 'boolean',
                description: 'Whether to allow overriding an existing server configuration with the same name (default: false)',
                default: false,
              },
            },
            required: ['client', 'server_name', 'json_config'],
          },
        },
        {
          name: 'remove_server_configuration',
          description: 'Remove a server configuration from a client configuration',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                description: 'Client name (cline, roo_code, windsurf, cursor, claude)',
              },
              server_name: {
                type: 'string',
                description: 'Name of the server to remove',
              },
            },
            required: ['client', 'server_name'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_configuration_path': {
          const client = validateClient(args.client);
          const configPath = getConfigPath(client);
          
          return {
            content: [
              {
                type: 'text',
                text: configPath,
              },
            ],
          };
        }
        
        case 'get_configuration': {
          const client = validateClient(args.client);
          const configPath = getConfigPath(client);
          const config = await readConfigFile(configPath);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(config, null, 2),
              },
            ],
          };
        }
        
        case 'list_servers': {
          const client = validateClient(args.client);
          const configPath = getConfigPath(client);
          
          let config;
          try {
            config = await readConfigFile(configPath);
          } catch (error) {
            if (error instanceof McpError && error.code === ErrorCode.InternalError && error.message.includes('not found')) {
              // Return empty array if configuration file doesn't exist
              return {
                content: [
                  {
                    type: 'text',
                    text: '[]',
                  },
                ],
              };
            } else {
              throw error;
            }
          }
          
          // Extract server names from the configuration
          let serverNames: string[] = [];
          if (config.mcpServers && typeof config.mcpServers === 'object') {
            serverNames = Object.keys(config.mcpServers);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(serverNames, null, 2),
              },
            ],
          };
        }
        
        case 'get_server_configuration': {
          const client = validateClient(args.client);
          const serverName = args.server_name;
          
          if (typeof serverName !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'server_name must be a string');
          }
          
          const configPath = getConfigPath(client);
          
          let config;
          try {
            config = await readConfigFile(configPath);
          } catch (error) {
            if (error instanceof McpError && error.code === ErrorCode.InternalError && error.message.includes('not found')) {
              throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not found in ${client} configuration (configuration file does not exist)`);
            } else {
              throw error;
            }
          }
          
          // Check if the server exists
          if (!config.mcpServers || !config.mcpServers[serverName]) {
            throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not found in ${client} configuration`);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(config.mcpServers[serverName], null, 2),
              },
            ],
          };
        }
        
        case 'add_server_configuration': {
          const client = validateClient(args.client);
          const serverName = args.server_name;
          const jsonConfig = args.json_config;
          const allowOverride = args.allow_override === true; // Default to false if not provided
          
          if (typeof serverName !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'server_name must be a string');
          }
          
          if (typeof jsonConfig !== 'object' || jsonConfig === null) {
            throw new McpError(ErrorCode.InvalidParams, 'json_config must be a valid JSON object');
          }
          
          const configPath = getConfigPath(client);
          let config;
          
          try {
            config = await readConfigFile(configPath);
          } catch (error) {
            if (error instanceof McpError && error.code === ErrorCode.InternalError && error.message.includes('not found')) {
              // Create a new configuration if it doesn't exist
              config = { mcpServers: {} };
            } else {
              throw error;
            }
          }
          
          // Ensure mcpServers object exists
          if (!config.mcpServers) {
            config.mcpServers = {};
          }
          
          // Check if server with the same name already exists
          const serverExists = config.mcpServers.hasOwnProperty(serverName);
          if (serverExists && !allowOverride) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Server '${serverName}' already exists in ${client} configuration. Set allow_override to true to update it.`
            );
          }
          
          // Add or update the server configuration
          config.mcpServers[serverName] = jsonConfig;
          
          // Write the updated configuration
          await writeConfigFile(configPath, config);
          
          const action = serverExists ? 'updated' : 'added';
          return {
            content: [
              {
                type: 'text',
                text: `Server '${serverName}' configuration ${action} in ${client} configuration`,
              },
            ],
          };
        }
        
        case 'remove_server_configuration': {
          const client = validateClient(args.client);
          const serverName = args.server_name;
          
          if (typeof serverName !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'server_name must be a string');
          }
          
          const configPath = getConfigPath(client);
          
          let config;
          try {
            config = await readConfigFile(configPath);
          } catch (error) {
            if (error instanceof McpError && error.code === ErrorCode.InternalError && error.message.includes('not found')) {
              // If the configuration file doesn't exist, there's nothing to remove
              return {
                content: [
                  {
                    type: 'text',
                    text: `Server '${serverName}' not found in ${client} configuration (configuration file does not exist)`,
                  },
                ],
              };
            } else {
              throw error;
            }
          }
          
          // Check if the server exists
          if (!config.mcpServers || !config.mcpServers[serverName]) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Server '${serverName}' not found in ${client} configuration`,
                },
              ],
            };
          }
          
          // Store the removed configuration
          const removedConfig = config.mcpServers[serverName];
          
          // Remove the server configuration
          delete config.mcpServers[serverName];
          
          // Write the updated configuration
          await writeConfigFile(configPath, config);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(removedConfig, null, 2),
              },
            ],
          };
        }
        
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Client Configuration Server running on stdio');
  }
}

const server = new ConfigurationServer();
server.run().catch(console.error);