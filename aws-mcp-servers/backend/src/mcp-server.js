import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CloudFormationClient, ListStacksCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';

dotenv.config();

class AWSMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'aws-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cloudFormationClient = null;
    this.stsClient = null;
    this.setupServer();
  }

  async initializeAWSClients() {
    try {
      // Initialize AWS credentials
      const credentials = process.env.AWS_PROFILE 
        ? fromIni({ profile: process.env.AWS_PROFILE })
        : fromEnv();

      const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

      // Initialize AWS clients
      this.cloudFormationClient = new CloudFormationClient({
        region,
        credentials
      });

      this.stsClient = new STSClient({
        region,
        credentials
      });

      // Test connection
      await this.testConnection();
      console.log('✅ AWS clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AWS clients:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const command = new GetCallerIdentityCommand({});
      const result = await this.stsClient.send(command);
      console.log('🔐 AWS Identity:', {
        Account: result.Account,
        Arn: result.Arn,
        UserId: result.UserId
      });
    } catch (error) {
      throw new Error(`AWS connection test failed: ${error.message}`);
    }
  }

  setupServer() {
    // Tool: List CloudFormation Stacks
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'list-cloudformation-stacks',
            description: 'List all CloudFormation stacks in the current AWS account',
            inputSchema: {
              type: 'object',
              properties: {
                stackStatusFilter: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter stacks by status (CREATE_COMPLETE, UPDATE_COMPLETE, etc.)'
                },
                region: {
                  type: 'string',
                  description: 'AWS region to list stacks from'
                }
              }
            }
          },
          {
            name: 'describe-cloudformation-stack',
            description: 'Get detailed information about a specific CloudFormation stack',
            inputSchema: {
              type: 'object',
              properties: {
                stackName: {
                  type: 'string',
                  description: 'Name or ARN of the CloudFormation stack',
                  required: true
                },
                region: {
                  type: 'string',
                  description: 'AWS region where the stack is located'
                }
              },
              required: ['stackName']
            }
          },
          {
            name: 'get-caller-identity',
            description: 'Get AWS caller identity information',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Tool call handler
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list-cloudformation-stacks':
            return await this.listCloudFormationStacks(args);
          case 'describe-cloudformation-stack':
            return await this.describeCloudFormationStack(args);
          case 'get-caller-identity':
            return await this.getCallerIdentity();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async listCloudFormationStacks(args = {}) {
    if (!this.cloudFormationClient) {
      await this.initializeAWSClients();
    }

    try {
      const input = {};
      
      if (args.stackStatusFilter && args.stackStatusFilter.length > 0) {
        input.StackStatusFilter = args.stackStatusFilter;
      }

      const command = new ListStacksCommand(input);
      const response = await this.cloudFormationClient.send(command);

      const stacks = response.StackSummaries.map(stack => ({
        StackName: stack.StackName,
        StackStatus: stack.StackStatus,
        CreationTime: stack.CreationTime,
        LastUpdatedTime: stack.LastUpdatedTime,
        TemplateDescription: stack.TemplateDescription,
        DriftInformation: stack.DriftInformation
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              stackCount: stacks.length,
              stacks: stacks
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list CloudFormation stacks: ${error.message}`);
    }
  }

  async describeCloudFormationStack(args) {
    if (!this.cloudFormationClient) {
      await this.initializeAWSClients();
    }

    try {
      const command = new DescribeStacksCommand({
        StackName: args.stackName
      });
      
      const response = await this.cloudFormationClient.send(command);
      const stack = response.Stacks[0];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              stack: {
                StackName: stack.StackName,
                StackStatus: stack.StackStatus,
                CreationTime: stack.CreationTime,
                LastUpdatedTime: stack.LastUpdatedTime,
                Description: stack.Description,
                Parameters: stack.Parameters,
                Outputs: stack.Outputs,
                Tags: stack.Tags,
                Capabilities: stack.Capabilities,
                RollbackConfiguration: stack.RollbackConfiguration
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to describe stack ${args.stackName}: ${error.message}`);
    }
  }

  async getCallerIdentity() {
    if (!this.stsClient) {
      await this.initializeAWSClients();
    }

    try {
      const command = new GetCallerIdentityCommand({});
      const response = await this.stsClient.send(command);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              identity: {
                Account: response.Account,
                Arn: response.Arn,
                UserId: response.UserId
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get caller identity: ${error.message}`);
    }
  }

  async start() {
    try {
      // Initialize AWS clients first
      await this.initializeAWSClients();

      // Start the MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('🚀 AWS MCP Server started successfully');
    } catch (error) {
      console.error('❌ Failed to start AWS MCP Server:', error);
      process.exit(1);
    }
  }
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AWSMCPServer();
  server.start().catch(console.error);
}

export default AWSMCPServer; 