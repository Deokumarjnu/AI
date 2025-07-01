import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AWSMCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  async connect() {
    try {
      console.log('🔄 Connecting to AWS MCP Server...');

      // Create transport to the MCP server
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [path.join(__dirname, 'mcp-server.js')],
        env: process.env
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'aws-mcp-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: true,
          },
        }
      );

      // Connect to the server
      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('✅ Connected to AWS MCP Server');
      
      // Test the connection
      await this.testConnection();
      
      return this.client;
    } catch (error) {
      console.error('❌ Failed to connect to AWS MCP Server:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const identity = await this.getCallerIdentity();
      console.log('🔐 AWS Connection verified:', identity);
    } catch (error) {
      console.warn('⚠️ AWS connection test failed:', error.message);
    }
  }

  async listTools() {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      throw new Error(`Failed to list tools: ${error.message}`);
    }
  }

  async listCloudFormationStacks(options = {}) {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const response = await this.client.callTool({
        name: 'list-cloudformation-stacks',
        arguments: options
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      throw new Error(`Failed to list CloudFormation stacks: ${error.message}`);
    }
  }

  async describeCloudFormationStack(stackName) {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const response = await this.client.callTool({
        name: 'describe-cloudformation-stack',
        arguments: { stackName }
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      throw new Error(`Failed to describe CloudFormation stack: ${error.message}`);
    }
  }

  async getCallerIdentity() {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const response = await this.client.callTool({
        name: 'get-caller-identity',
        arguments: {}
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      throw new Error(`Failed to get caller identity: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client && this.connected) {
      try {
        await this.client.close();
        this.connected = false;
        console.log('🔌 Disconnected from AWS MCP Server');
      } catch (error) {
        console.error('❌ Error disconnecting:', error);
      }
    }
  }
}

export default AWSMCPClient; 