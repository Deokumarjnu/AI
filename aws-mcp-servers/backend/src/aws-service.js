import { CloudFormationClient, ListStacksCommand, DescribeStacksCommand, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { OrganizationsClient, DescribeAccountCommand, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { APIGatewayClient, GetRestApisCommand, GetResourcesCommand, GetStagesCommand } from '@aws-sdk/client-api-gateway';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBInstancesCommand, StartDBInstanceCommand, StopDBInstanceCommand, DescribeDBClustersCommand, StartDBClusterCommand, StopDBClusterCommand } from '@aws-sdk/client-rds';
import { ECSClient, DescribeServicesCommand, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { CostExplorerClient, GetCostAndUsageCommand, GetDimensionValuesCommand } from '@aws-sdk/client-cost-explorer';
import { fromEnv, fromIni, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

class AWSService {
  constructor() {
    this.cloudFormationClient = null;
    this.stsClient = null;
    this.organizationsClient = null;
    this.apiGatewayClient = null;
    this.cloudWatchLogsClient = null;
    this.ec2Client = null;
    this.rdsClient = null;
    this.ecsClient = null;
    this.costExplorerClient = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing AWS Service...');
      
      // Initialize AWS credentials
      const credentials = process.env.AWS_PROFILE 
        ? fromIni({ profile: process.env.AWS_PROFILE })
        : fromEnv();

      const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

      console.log('📍 Region:', region);
      console.log('🔐 Credentials method:', process.env.AWS_PROFILE ? 'AWS Profile' : 'Environment Variables');

      // Initialize AWS clients
      this.cloudFormationClient = new CloudFormationClient({
        region,
        credentials
      });

      this.stsClient = new STSClient({
        region,
        credentials
      });

      // Initialize API Gateway client
      this.apiGatewayClient = new APIGatewayClient({
        region,
        credentials
      });

      // Initialize CloudWatch Logs client
      this.cloudWatchLogsClient = new CloudWatchLogsClient({
        region,
        credentials
      });

      // Initialize EC2 client
      this.ec2Client = new EC2Client({
        region,
        credentials
      });

      // Initialize RDS client
      this.rdsClient = new RDSClient({
        region,
        credentials
      });

      // Initialize ECS client
      this.ecsClient = new ECSClient({
        region,
        credentials
      });

      // Initialize Organizations client (might fail if not in management account)
      try {
        this.organizationsClient = new OrganizationsClient({
          region,
          credentials
        });
      } catch (error) {
        console.log('⚠️ Organizations API not available (not a management account)');
      }

      // Initialize Cost Explorer client
      this.costExplorerClient = new CostExplorerClient({
        region,
        credentials
      });

      // Test connection
      await this.testConnection();
      this.initialized = true;
      console.log('✅ AWS Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AWS Service:', error.message);
      this.initialized = false;
      return false;
    }
  }

  async testConnection() {
    try {
      const command = new GetCallerIdentityCommand({});
      const result = await this.stsClient.send(command);
      console.log('🔐 AWS Identity verified:', {
        Account: result.Account,
        Arn: result.Arn,
        UserId: result.UserId
      });
      return result;
    } catch (error) {
      throw new Error(`AWS connection test failed: ${error.message}`);
    }
  }

  async getAccountName(accountId) {
    console.log(`🔍 Looking up account name for: ${accountId}`);
    
    // Try Organizations API first
    if (this.organizationsClient) {
      try {
        const command = new DescribeAccountCommand({ AccountId: accountId });
        const response = await this.organizationsClient.send(command);
        console.log(`✅ Organizations API returned: ${response.Account.Name}`);
        return response.Account.Name;
      } catch (error) {
        console.log(`⚠️ Organizations API failed for account ${accountId}: ${error.message}`);
      }
    }

    // Fallback to configuration file
    try {
      const configPath = join(__dirname, '../config/accounts.json');
      const configData = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      if (config.accounts[accountId]) {
        console.log(`✅ Config file returned: ${config.accounts[accountId].name}`);
        return config.accounts[accountId].name;
      }
      
      console.log(`⚠️ Account ${accountId} not found in config, using default`);
      return config.defaultName || `AWS Account ${accountId}`;
    } catch (error) {
      console.log(`⚠️ Config file read failed: ${error.message}`);
      // Final fallback
      return `AWS Account ${accountId}`;
    }
  }

  async getCallerIdentity() {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      const command = new GetCallerIdentityCommand({});
      const response = await this.stsClient.send(command);

      // Try to get account name
      const accountName = await this.getAccountName(response.Account);

      return {
        success: true,
        identity: {
          Account: response.Account,
          AccountName: accountName,
          Arn: response.Arn,
          UserId: response.UserId
        }
      };
    } catch (error) {
      throw new Error(`Failed to get caller identity: ${error.message}`);
    }
  }

  async getCredentialsForAccount(accountId, accountConfig = null) {
    // Get current account
    const currentIdentity = await this.stsClient.send(new GetCallerIdentityCommand({}));
    
    if (currentIdentity.Account === accountId) {
      // Same account, use current credentials
      return {
        credentials: process.env.AWS_PROFILE ? fromIni({ profile: process.env.AWS_PROFILE }) : fromEnv(),
        region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
      };
    }

    // Check if account has a specific profile configured
    if (accountConfig && accountConfig.profile) {
      console.log(`🔄 Using AWS profile: ${accountConfig.profile} for account ${accountId}`);
      return {
        credentials: fromIni({ profile: accountConfig.profile }),
        region: accountConfig.region || process.env.AWS_DEFAULT_REGION || 'us-east-1'
      };
    }

    // Fallback to cross-account role assumption
    try {
      const roleArn = `arn:aws:iam::${accountId}:role/CrossAccountAccessRole`;
      console.log(`🔄 Attempting to assume role: ${roleArn}`);
      
      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `cross-account-access-${Date.now()}`
      });
      
      const assumeRoleResponse = await this.stsClient.send(assumeRoleCommand);
      
      return {
        credentials: {
          accessKeyId: assumeRoleResponse.Credentials.AccessKeyId,
          secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey,
          sessionToken: assumeRoleResponse.Credentials.SessionToken
        },
        region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
      };
    } catch (error) {
      console.log(`❌ Failed to assume role for account ${accountId}: ${error.message}`);
      throw new Error(`Cannot access account ${accountId}: ${error.message}`);
    }
  }

  async getAllAccounts() {
    try {
      const configPath = join(__dirname, '../config/accounts.json');
      const configData = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      const accounts = [];
      
      for (const [accountId, accountInfo] of Object.entries(config.accounts)) {
        try {
          // Try to get credentials for this account
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountInfo);
          
          // Create CloudFormation client for this account
          const cfClient = new CloudFormationClient({ credentials, region });
          
          // Get stacks for this account
          const stacksResponse = await cfClient.send(new ListStacksCommand({}));
          const filteredStacks = stacksResponse.StackSummaries.filter(stack => 
            stack.StackStatus !== 'DELETE_COMPLETE'
          );
          
          accounts.push({
            id: accountId,
            name: accountInfo.name,
            environment: accountInfo.environment,
            region: region,
            stackCount: filteredStacks.length,
            stacks: filteredStacks.map(stack => ({
              StackName: stack.StackName,
              StackStatus: stack.StackStatus,
              CreationTime: stack.CreationTime.toISOString(),
              LastUpdatedTime: stack.LastUpdatedTime ? stack.LastUpdatedTime.toISOString() : null
            })),
            accessible: true
          });
        } catch (error) {
          console.log(`⚠️ Cannot access account ${accountId}: ${error.message}`);
          accounts.push({
            id: accountId,
            name: accountInfo.name,
            environment: accountInfo.environment,
            region: accountInfo.region || 'us-east-1',
            stackCount: 0,
            stacks: [],
            accessible: false,
            error: error.message
          });
        }
      }
      
      return accounts;
    } catch (error) {
      throw new Error(`Failed to get all accounts: ${error.message}`);
    }
  }

  async listCloudFormationStacks(options = {}) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      // If accountId is specified, use that account's credentials
      let client = this.cloudFormationClient;
      
      if (options.accountId) {
        // Get account config for profile information
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[options.accountId];
        
        const { credentials, region } = await this.getCredentialsForAccount(options.accountId, accountConfig);
        client = new CloudFormationClient({ credentials, region });
      }

      const input = {};
      
      if (options.stackStatusFilter && options.stackStatusFilter.length > 0) {
        input.StackStatusFilter = options.stackStatusFilter;
      }

      const command = new ListStacksCommand(input);
      const response = await client.send(command);

      // Filter out deleted stacks and duplicates
      const filteredStacks = response.StackSummaries.filter(stack => 
        stack.StackStatus !== 'DELETE_COMPLETE'
      );

      const stacks = filteredStacks.map(stack => ({
        StackName: stack.StackName,
        StackStatus: stack.StackStatus,
        CreationTime: stack.CreationTime.toISOString(),
        LastUpdatedTime: stack.LastUpdatedTime ? stack.LastUpdatedTime.toISOString() : null,
        TemplateDescription: stack.TemplateDescription,
        DriftInformation: stack.DriftInformation
      }));

      // Remove potential duplicates based on stack name (keep the most recent)
      const uniqueStacks = stacks.reduce((acc, current) => {
        const existing = acc.find(stack => stack.StackName === current.StackName);
        if (!existing) {
          acc.push(current);
        } else {
          console.log(`🔄 Found duplicate stack: ${current.StackName} - keeping most recent`);
          // Keep the more recently updated stack
          if (new Date(current.LastUpdatedTime || current.CreationTime) > 
              new Date(existing.LastUpdatedTime || existing.CreationTime)) {
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
        }
        return acc;
      }, []);

      console.log(`📦 AWS CloudFormation: ${response.StackSummaries.length} total → ${filteredStacks.length} active → ${uniqueStacks.length} unique stacks`);

      return {
        success: true,
        stackCount: uniqueStacks.length,
        stacks: uniqueStacks,
        region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
      };
    } catch (error) {
      throw new Error(`Failed to list CloudFormation stacks: ${error.message}`);
    }
  }

  async describeCloudFormationStack(stackName) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      const command = new DescribeStacksCommand({
        StackName: stackName
      });
      
      const response = await this.cloudFormationClient.send(command);
      const stack = response.Stacks[0];

      return {
        success: true,
        stack: {
          StackName: stack.StackName,
          StackStatus: stack.StackStatus,
          CreationTime: stack.CreationTime.toISOString(),
          LastUpdatedTime: stack.LastUpdatedTime ? stack.LastUpdatedTime.toISOString() : null,
          Description: stack.Description,
          Parameters: stack.Parameters,
          Outputs: stack.Outputs,
          Tags: stack.Tags,
          Capabilities: stack.Capabilities,
          RollbackConfiguration: stack.RollbackConfiguration
        }
      };
    } catch (error) {
      throw new Error(`Failed to describe stack ${stackName}: ${error.message}`);
    }
  }

  async getStackResources(stackName) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      const command = new DescribeStackResourcesCommand({
        StackName: stackName
      });
      
      const response = await this.cloudFormationClient.send(command);

      const resources = response.StackResources.map(resource => ({
        LogicalResourceId: resource.LogicalResourceId,
        PhysicalResourceId: resource.PhysicalResourceId,
        ResourceType: resource.ResourceType,
        ResourceStatus: resource.ResourceStatus,
        Timestamp: resource.Timestamp ? resource.Timestamp.toISOString() : null,
        ResourceStatusReason: resource.ResourceStatusReason,
        Description: resource.Description
      }));

      return {
        success: true,
        stackName: stackName,
        resourceCount: resources.length,
        resources: resources
      };
    } catch (error) {
      throw new Error(`Failed to get resources for stack ${stackName}: ${error.message}`);
    }
  }

  async getApiGatewayApis(accountId) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`🔍 Fetching API Gateway APIs for account: ${accountId}`);
      
      // Get credentials for the specific account
      let client = this.apiGatewayClient;
      
      if (accountId) {
        // Get account config for profile information
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          client = new APIGatewayClient({ credentials, region });
        }
      }

      // Get REST APIs
      const restApisCommand = new GetRestApisCommand({});
      const restApisResponse = await client.send(restApisCommand);

      const apis = await Promise.all(
        restApisResponse.items.map(async (api) => {
          try {
            // Get stages for each API
            const stagesCommand = new GetStagesCommand({ restApiId: api.id });
            const stagesResponse = await client.send(stagesCommand);

            // Get resources (API paths) for each API
            let resources = [];
            try {
              const resourcesCommand = new GetResourcesCommand({ restApiId: api.id });
              const resourcesResponse = await client.send(resourcesCommand);
              
              resources = resourcesResponse.items ? resourcesResponse.items.map(resource => ({
                id: resource.id,
                parentId: resource.parentId,
                pathPart: resource.pathPart,
                path: resource.path,
                resourceMethods: resource.resourceMethods ? Object.keys(resource.resourceMethods) : []
              })) : [];
            } catch (resourceError) {
              console.log(`⚠️ Failed to get resources for API ${api.id}: ${resourceError.message}`);
            }
            
            return {
              id: api.id,
              name: api.name,
              description: api.description,
              createdDate: api.createdDate ? api.createdDate.toISOString() : null,
              version: api.version,
              warnings: api.warnings,
              binaryMediaTypes: api.binaryMediaTypes,
              minimumCompressionSize: api.minimumCompressionSize,
              apiKeySource: api.apiKeySource,
              endpointConfiguration: api.endpointConfiguration,
              policy: api.policy,
              tags: api.tags,
              resources: resources,
              stages: stagesResponse.item ? stagesResponse.item.map(stage => ({
                stageName: stage.stageName,
                deploymentId: stage.deploymentId,
                description: stage.description,
                createdDate: stage.createdDate ? stage.createdDate.toISOString() : null,
                lastUpdatedDate: stage.lastUpdatedDate ? stage.lastUpdatedDate.toISOString() : null,
                cacheClusterEnabled: stage.cacheClusterEnabled,
                cacheClusterSize: stage.cacheClusterSize,
                methodSettings: stage.methodSettings,
                variables: stage.variables,
                documentationVersion: stage.documentationVersion,
                accessLogSettings: stage.accessLogSettings,
                canarySettings: stage.canarySettings,
                tracingConfig: stage.tracingConfig,
                webAclArn: stage.webAclArn,
                tags: stage.tags
              })) : []
            };
          } catch (stageError) {
            console.log(`⚠️ Failed to get stages for API ${api.id}: ${stageError.message}`);
            return {
              id: api.id,
              name: api.name,
              description: api.description,
              createdDate: api.createdDate ? api.createdDate.toISOString() : null,
              version: api.version,
              resources: [],
              stages: [],
              error: `Failed to get stages: ${stageError.message}`
            };
          }
        })
      );

      console.log(`✅ Found ${apis.length} API Gateway APIs`);

      return {
        success: true,
        accountId: accountId,
        apiCount: apis.length,
        apis: apis
      };
    } catch (error) {
      console.error(`❌ Failed to get API Gateway APIs for account ${accountId}:`, error.message);
      throw new Error(`Failed to get API Gateway APIs: ${error.message}`);
    }
  }

  async getApiGatewayApisByStack(accountId, stackName) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`🔍 Fetching API Gateway APIs for stack: ${stackName} in account: ${accountId}`);
      
      // Get credentials for the specific account
      let cfClient = this.cloudFormationClient;
      let apiClient = this.apiGatewayClient;
      
      if (accountId) {
        // Get account config for profile information
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          cfClient = new CloudFormationClient({ credentials, region });
          apiClient = new APIGatewayClient({ credentials, region });
        }
      }

      // First, get all resources from the CloudFormation stack
      const stackResourcesCommand = new DescribeStackResourcesCommand({
        StackName: stackName
      });
      
      const stackResourcesResponse = await cfClient.send(stackResourcesCommand);
      
      // Filter for API Gateway related resources
      const apiGatewayResources = stackResourcesResponse.StackResources.filter(resource => 
        resource.ResourceType.startsWith('AWS::ApiGateway::') && 
        resource.ResourceType === 'AWS::ApiGateway::RestApi'
      );

      console.log(`📋 Found ${apiGatewayResources.length} API Gateway resources in stack ${stackName}`);

      if (apiGatewayResources.length === 0) {
        return {
          success: true,
          accountId: accountId,
          stackName: stackName,
          apiCount: 0,
          apis: [],
          message: `No API Gateway resources found in stack ${stackName}`
        };
      }

      // Get detailed information for each API
      const apis = await Promise.all(
        apiGatewayResources.map(async (resource) => {
          try {
            const apiId = resource.PhysicalResourceId;
            
            // Get stages for each API
            const stagesCommand = new GetStagesCommand({ restApiId: apiId });
            const stagesResponse = await apiClient.send(stagesCommand);

            // Get resources (API paths) for each API
            let apiResources = [];
            try {
              const resourcesCommand = new GetResourcesCommand({ restApiId: apiId });
              const resourcesResponse = await apiClient.send(resourcesCommand);
              
              apiResources = resourcesResponse.items ? resourcesResponse.items.map(res => ({
                id: res.id,
                parentId: res.parentId,
                pathPart: res.pathPart,
                path: res.path,
                resourceMethods: res.resourceMethods ? Object.keys(res.resourceMethods) : []
              })) : [];
            } catch (resourceError) {
              console.log(`⚠️ Failed to get resources for API ${apiId}: ${resourceError.message}`);
            }

            // Get the API details
            const restApisCommand = new GetRestApisCommand({});
            const restApisResponse = await apiClient.send(restApisCommand);
            const apiDetails = restApisResponse.items.find(api => api.id === apiId);
            
            return {
              id: apiId,
              name: apiDetails?.name || resource.LogicalResourceId,
              description: apiDetails?.description || `API from CloudFormation stack ${stackName}`,
              createdDate: apiDetails?.createdDate ? apiDetails.createdDate.toISOString() : null,
              version: apiDetails?.version,
              cloudFormationLogicalId: resource.LogicalResourceId,
              cloudFormationResourceType: resource.ResourceType,
              cloudFormationResourceStatus: resource.ResourceStatus,
              warnings: apiDetails?.warnings,
              binaryMediaTypes: apiDetails?.binaryMediaTypes,
              minimumCompressionSize: apiDetails?.minimumCompressionSize,
              apiKeySource: apiDetails?.apiKeySource,
              endpointConfiguration: apiDetails?.endpointConfiguration,
              policy: apiDetails?.policy,
              tags: apiDetails?.tags,
              resources: apiResources,
              stages: stagesResponse.item ? stagesResponse.item.map(stage => ({
                stageName: stage.stageName,
                deploymentId: stage.deploymentId,
                description: stage.description,
                createdDate: stage.createdDate ? stage.createdDate.toISOString() : null,
                lastUpdatedDate: stage.lastUpdatedDate ? stage.lastUpdatedDate.toISOString() : null,
                cacheClusterEnabled: stage.cacheClusterEnabled,
                cacheClusterSize: stage.cacheClusterSize,
                methodSettings: stage.methodSettings,
                variables: stage.variables,
                documentationVersion: stage.documentationVersion,
                accessLogSettings: stage.accessLogSettings,
                canarySettings: stage.canarySettings,
                tracingConfig: stage.tracingConfig,
                webAclArn: stage.webAclArn,
                tags: stage.tags
              })) : []
            };
          } catch (apiError) {
            console.log(`⚠️ Failed to get details for API ${resource.PhysicalResourceId}: ${apiError.message}`);
            return {
              id: resource.PhysicalResourceId,
              name: resource.LogicalResourceId,
              description: `API from CloudFormation stack ${stackName}`,
              cloudFormationLogicalId: resource.LogicalResourceId,
              cloudFormationResourceType: resource.ResourceType,
              cloudFormationResourceStatus: resource.ResourceStatus,
              resources: [],
              stages: [],
              error: `Failed to get API details: ${apiError.message}`
            };
          }
        })
      );

      console.log(`✅ Found ${apis.length} API Gateway APIs in stack ${stackName}`);

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        apiCount: apis.length,
        apis: apis
      };
    } catch (error) {
      console.error(`❌ Failed to get API Gateway APIs for stack ${stackName}:`, error.message);
      throw new Error(`Failed to get API Gateway APIs for stack: ${error.message}`);
    }
  }

  async getStackCloudWatchLogs(accountId, stackName) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`📋 Fetching CloudWatch logs for stack: ${stackName} in account: ${accountId}`);
      
      // Get credentials for the specific account
      let cfClient = this.cloudFormationClient;
      let logsClient = this.cloudWatchLogsClient;
      
      if (accountId) {
        // Get account config for profile information
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          cfClient = new CloudFormationClient({ credentials, region });
          logsClient = new CloudWatchLogsClient({ credentials, region });
        }
      }

      // First, get all resources from the CloudFormation stack
      const stackResourcesCommand = new DescribeStackResourcesCommand({
        StackName: stackName
      });
      
      const stackResourcesResponse = await cfClient.send(stackResourcesCommand);
      
      // Filter for resources that typically have CloudWatch logs
      const logProducingResources = stackResourcesResponse.StackResources.filter(resource => 
        resource.ResourceType === 'AWS::Lambda::Function' ||
        resource.ResourceType === 'AWS::ApiGateway::RestApi' ||
        resource.ResourceType === 'AWS::ApiGateway::Stage' ||
        resource.ResourceType === 'AWS::ECS::Service' ||
        resource.ResourceType === 'AWS::ECS::TaskDefinition' ||
        resource.ResourceType === 'Custom::LogRetention' ||
        resource.ResourceType === 'AWS::Logs::LogGroup'
      );

      console.log(`📋 Found ${logProducingResources.length} log-producing resources in stack ${stackName}`);
      
      // Log the resources for debugging
      logProducingResources.forEach(resource => {
        console.log(`🔍 Resource: ${resource.LogicalResourceId} (${resource.ResourceType}) -> ${resource.PhysicalResourceId}`);
      });

      if (logProducingResources.length === 0) {
        return {
          success: true,
          accountId: accountId,
          stackName: stackName,
          logGroups: [],
          message: `No log-producing resources found in stack ${stackName}`
        };
      }

      // Build potential log group names based on resources
      const logGroupPatterns = [];
      const logGroupNames = new Set();
      
      for (const resource of logProducingResources) {
        if (resource.ResourceType === 'AWS::Lambda::Function') {
          // Lambda functions have log groups like /aws/lambda/function-name
          const lambdaLogGroup = `/aws/lambda/${resource.PhysicalResourceId}`;
          logGroupPatterns.push(lambdaLogGroup);
          logGroupNames.add(lambdaLogGroup);
        } else if (resource.ResourceType === 'Custom::LogRetention') {
          // Custom log retention resources specify the log group directly
          logGroupPatterns.push(resource.PhysicalResourceId);
          logGroupNames.add(resource.PhysicalResourceId);
        } else if (resource.ResourceType === 'AWS::Logs::LogGroup') {
          // Direct log group resources
          logGroupPatterns.push(resource.PhysicalResourceId);
          logGroupNames.add(resource.PhysicalResourceId);
        }
      }

      console.log(`🔍 Expected log group patterns: ${Array.from(logGroupNames).join(', ')}`);

      // Get all log groups in the account (with pagination)
      let allLogGroups = [];
      let nextToken = undefined;
      
      do {
        const describeLogGroupsCommand = new DescribeLogGroupsCommand({
          limit: 50,
          nextToken: nextToken
        });
        
        const logGroupsResponse = await logsClient.send(describeLogGroupsCommand);
        
        if (logGroupsResponse.logGroups) {
          allLogGroups = allLogGroups.concat(logGroupsResponse.logGroups);
        }
        
        nextToken = logGroupsResponse.nextToken;
      } while (nextToken && allLogGroups.length < 200); // Limit to 200 log groups max

      console.log(`🔍 Found ${allLogGroups.length} total log groups in account`);

      // Filter log groups that belong to our stack (more comprehensive matching)
      const stackLogGroups = allLogGroups.filter(logGroup => {
        const logGroupName = logGroup.logGroupName;
        
        // Direct match with our expected patterns
        if (logGroupNames.has(logGroupName)) {
          return true;
        }
        
        // Check if log group name contains the stack name
        if (logGroupName.includes(stackName)) {
          return true;
        }
        
        // Check if log group name contains any of our resource physical IDs
        for (const resource of logProducingResources) {
          if (resource.PhysicalResourceId && logGroupName.includes(resource.PhysicalResourceId)) {
            return true;
          }
        }
        
        // Check for Lambda function pattern matches
        for (const pattern of logGroupPatterns) {
          if (pattern.includes('/aws/lambda/') && logGroupName.includes(pattern.split('/').pop())) {
            return true;
          }
        }
        
        return false;
      });

      console.log(`📋 Found ${stackLogGroups.length} relevant log groups for stack ${stackName}`);
      
      // Log the found log groups for debugging
      stackLogGroups.forEach(logGroup => {
        console.log(`✅ Found log group: ${logGroup.logGroupName}`);
      });

      if (stackLogGroups.length === 0) {
        // If no log groups found, return some debug info
        const debugInfo = {
          success: true,
          accountId: accountId,
          stackName: stackName,
          logGroupCount: 0,
          logGroups: [],
          debug: {
            totalResourcesInStack: stackResourcesResponse.StackResources.length,
            logProducingResourcesFound: logProducingResources.length,
            totalLogGroupsInAccount: allLogGroups.length,
            expectedPatterns: Array.from(logGroupNames),
            message: 'No matching log groups found. This could be due to naming patterns, permissions, or logs not being created yet.'
          }
        };
        
        console.log(`❌ No log groups found. Debug info:`, debugInfo.debug);
        return debugInfo;
      }

      // Get recent log events from each log group
      const logGroupsWithEvents = await Promise.all(
        stackLogGroups.slice(0, 10).map(async (logGroup) => { // Limit to 10 log groups
          try {
            const getLogEventsCommand = new GetLogEventsCommand({
              logGroupName: logGroup.logGroupName,
              limit: 100, // Get last 100 log entries
              startFromHead: false // Get most recent logs first
            });
            
            const logEventsResponse = await logsClient.send(getLogEventsCommand);
            
            // Find the corresponding CloudFormation resource
            const relatedResource = logProducingResources.find(resource => 
              logGroup.logGroupName.includes(resource.PhysicalResourceId) ||
              logGroup.logGroupName === `/aws/lambda/${resource.PhysicalResourceId}` ||
              logGroup.logGroupName === resource.PhysicalResourceId
            );
            
            return {
              logGroupName: logGroup.logGroupName,
              logStreamName: logEventsResponse.events?.[0]?.logStreamName || 'N/A',
              creationTime: logGroup.creationTime ? new Date(logGroup.creationTime).toISOString() : null,
              storedBytes: logGroup.storedBytes || 0,
              retentionInDays: logGroup.retentionInDays,
              cloudFormationResource: relatedResource ? {
                logicalId: relatedResource.LogicalResourceId,
                physicalId: relatedResource.PhysicalResourceId,
                resourceType: relatedResource.ResourceType,
                resourceStatus: relatedResource.ResourceStatus
              } : null,
              events: logEventsResponse.events ? logEventsResponse.events.slice(0, 50).map(event => ({
                timestamp: new Date(event.timestamp).toISOString(),
                message: event.message.trim(),
                ingestionTime: new Date(event.ingestionTime).toISOString()
              })) : []
            };
          } catch (logError) {
            console.log(`⚠️ Failed to get log events for ${logGroup.logGroupName}: ${logError.message}`);
            return {
              logGroupName: logGroup.logGroupName,
              logStreamName: 'N/A',
              creationTime: logGroup.creationTime ? new Date(logGroup.creationTime).toISOString() : null,
              storedBytes: logGroup.storedBytes || 0,
              retentionInDays: logGroup.retentionInDays,
              events: [],
              error: `Failed to fetch logs: ${logError.message}`
            };
          }
        })
      );

      console.log(`✅ Retrieved logs from ${logGroupsWithEvents.length} log groups for stack ${stackName}`);

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        logGroupCount: logGroupsWithEvents.length,
        logGroups: logGroupsWithEvents
      };
    } catch (error) {
      console.error(`❌ Failed to get CloudWatch logs for stack ${stackName}:`, error.message);
      throw new Error(`Failed to get CloudWatch logs for stack: ${error.message}`);
    }
  }

  async getStackControllableResources(accountId, stackName) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`🔍 Fetching controllable resources for stack: ${stackName} in account: ${accountId}`);
      
      // Get credentials for the specific account
      let cfClient = this.cloudFormationClient;
      let ec2Client = this.ec2Client;
      let rdsClient = this.rdsClient;
      let ecsClient = this.ecsClient;
      
      if (accountId) {
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          cfClient = new CloudFormationClient({ credentials, region });
          ec2Client = new EC2Client({ credentials, region });
          rdsClient = new RDSClient({ credentials, region });
          ecsClient = new ECSClient({ credentials, region });
        }
      }

      // Get all resources from the CloudFormation stack
      const stackResourcesCommand = new DescribeStackResourcesCommand({
        StackName: stackName
      });
      
      const stackResourcesResponse = await cfClient.send(stackResourcesCommand);
      
      // Filter for controllable resources
      const controllableResources = stackResourcesResponse.StackResources.filter(resource => 
        resource.ResourceType === 'AWS::EC2::Instance' ||
        resource.ResourceType === 'AWS::RDS::DBInstance' ||
        resource.ResourceType === 'AWS::RDS::DBCluster' ||
        resource.ResourceType === 'AWS::ECS::Service' ||
        resource.ResourceType === 'AWS::AutoScaling::AutoScalingGroup'
      );

      console.log(`🔍 Found ${controllableResources.length} controllable resources in stack ${stackName}`);

      // Get current status for each resource
      const resourcesWithStatus = await Promise.all(
        controllableResources.map(async (resource) => {
          try {
            let status = 'unknown';
            let canStart = false;
            let canStop = false;
            let details = {};

            if (resource.ResourceType === 'AWS::EC2::Instance') {
              const describeCommand = new DescribeInstancesCommand({
                InstanceIds: [resource.PhysicalResourceId]
              });
              const instancesResponse = await ec2Client.send(describeCommand);
              const instance = instancesResponse.Reservations?.[0]?.Instances?.[0];
              
              if (instance) {
                status = instance.State.Name;
                canStart = status === 'stopped';
                canStop = status === 'running';
                details = {
                  instanceType: instance.InstanceType,
                  publicIp: instance.PublicIpAddress,
                  privateIp: instance.PrivateIpAddress
                };
              }
            } else if (resource.ResourceType === 'AWS::RDS::DBInstance') {
              const describeCommand = new DescribeDBInstancesCommand({
                DBInstanceIdentifier: resource.PhysicalResourceId
              });
              const dbResponse = await rdsClient.send(describeCommand);
              const dbInstance = dbResponse.DBInstances?.[0];
              
              if (dbInstance) {
                status = dbInstance.DBInstanceStatus;
                canStart = status === 'stopped';
                canStop = status === 'available';
                details = {
                  engine: dbInstance.Engine,
                  engineVersion: dbInstance.EngineVersion,
                  dbInstanceClass: dbInstance.DBInstanceClass
                };
              }
            } else if (resource.ResourceType === 'AWS::RDS::DBCluster') {
              const describeCommand = new DescribeDBClustersCommand({
                DBClusterIdentifier: resource.PhysicalResourceId
              });
              const clusterResponse = await rdsClient.send(describeCommand);
              const dbCluster = clusterResponse.DBClusters?.[0];
              
              if (dbCluster) {
                status = dbCluster.Status;
                canStart = status === 'stopped';
                canStop = status === 'available';
                details = {
                  engine: dbCluster.Engine,
                  engineVersion: dbCluster.EngineVersion
                };
              }
            } else if (resource.ResourceType === 'AWS::ECS::Service') {
              // For ECS services, we'll consider "stopped" as having 0 desired count
              const clusterArn = resource.PhysicalResourceId.split('/')[0]; // Extract cluster from service ARN
              const serviceName = resource.PhysicalResourceId.split('/')[1];
              
              const describeCommand = new DescribeServicesCommand({
                cluster: clusterArn,
                services: [serviceName]
              });
              const serviceResponse = await ecsClient.send(describeCommand);
              const service = serviceResponse.services?.[0];
              
              if (service) {
                const desiredCount = service.desiredCount;
                status = desiredCount > 0 ? 'running' : 'stopped';
                canStart = desiredCount === 0;
                canStop = desiredCount > 0;
                details = {
                  desiredCount: service.desiredCount,
                  runningCount: service.runningCount,
                  taskDefinition: service.taskDefinition
                };
              }
            }

            return {
              logicalResourceId: resource.LogicalResourceId,
              physicalResourceId: resource.PhysicalResourceId,
              resourceType: resource.ResourceType,
              resourceStatus: resource.ResourceStatus,
              currentStatus: status,
              canStart: canStart,
              canStop: canStop,
              details: details
            };
          } catch (error) {
            console.log(`⚠️ Failed to get status for ${resource.LogicalResourceId}: ${error.message}`);
            return {
              logicalResourceId: resource.LogicalResourceId,
              physicalResourceId: resource.PhysicalResourceId,
              resourceType: resource.ResourceType,
              resourceStatus: resource.ResourceStatus,
              currentStatus: 'error',
              canStart: false,
              canStop: false,
              error: error.message
            };
          }
        })
      );

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        resourceCount: resourcesWithStatus.length,
        resources: resourcesWithStatus
      };
    } catch (error) {
      console.error(`❌ Failed to get controllable resources for stack ${stackName}:`, error.message);
      throw new Error(`Failed to get controllable resources: ${error.message}`);
    }
  }

  async startStackResources(accountId, stackName, resourceIds = []) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`▶️ Starting resources for stack: ${stackName} in account: ${accountId}`);
      
      // Get credentials for the specific account
      let cfClient = this.cloudFormationClient;
      let ec2Client = this.ec2Client;
      let rdsClient = this.rdsClient;
      let ecsClient = this.ecsClient;
      
      if (accountId) {
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          cfClient = new CloudFormationClient({ credentials, region });
          ec2Client = new EC2Client({ credentials, region });
          rdsClient = new RDSClient({ credentials, region });
          ecsClient = new ECSClient({ credentials, region });
        }
      }

      // Get controllable resources
      const controllableResources = await this.getStackControllableResources(accountId, stackName);
      
      // Filter to only resources that can be started
      const resourcesToStart = controllableResources.resources.filter(resource => 
        resource.canStart && (resourceIds.length === 0 || resourceIds.includes(resource.physicalResourceId))
      );

      console.log(`▶️ Starting ${resourcesToStart.length} resources`);

      const results = await Promise.all(
        resourcesToStart.map(async (resource) => {
          try {
            if (resource.resourceType === 'AWS::EC2::Instance') {
              const startCommand = new StartInstancesCommand({
                InstanceIds: [resource.physicalResourceId]
              });
              await ec2Client.send(startCommand);
              return { resourceId: resource.physicalResourceId, action: 'start', status: 'success' };
            } else if (resource.resourceType === 'AWS::RDS::DBInstance') {
              const startCommand = new StartDBInstanceCommand({
                DBInstanceIdentifier: resource.physicalResourceId
              });
              await rdsClient.send(startCommand);
              return { resourceId: resource.physicalResourceId, action: 'start', status: 'success' };
            } else if (resource.resourceType === 'AWS::RDS::DBCluster') {
              const startCommand = new StartDBClusterCommand({
                DBClusterIdentifier: resource.physicalResourceId
              });
              await rdsClient.send(startCommand);
              return { resourceId: resource.physicalResourceId, action: 'start', status: 'success' };
            }
            // Note: ECS services would need more complex logic to restore previous desired count
            return { resourceId: resource.physicalResourceId, action: 'start', status: 'not_implemented' };
          } catch (error) {
            console.log(`❌ Failed to start ${resource.physicalResourceId}: ${error.message}`);
            return { resourceId: resource.physicalResourceId, action: 'start', status: 'error', error: error.message };
          }
        })
      );

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        action: 'start',
        results: results
      };
    } catch (error) {
      console.error(`❌ Failed to start resources for stack ${stackName}:`, error.message);
      throw new Error(`Failed to start resources: ${error.message}`);
    }
  }

  async stopStackResources(accountId, stackName, resourceIds = []) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`⏹️ Stopping resources for stack: ${stackName} in account: ${accountId}`);
      
      // Get credentials for the specific account
      let cfClient = this.cloudFormationClient;
      let ec2Client = this.ec2Client;
      let rdsClient = this.rdsClient;
      let ecsClient = this.ecsClient;
      
      if (accountId) {
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          cfClient = new CloudFormationClient({ credentials, region });
          ec2Client = new EC2Client({ credentials, region });
          rdsClient = new RDSClient({ credentials, region });
          ecsClient = new ECSClient({ credentials, region });
        }
      }

      // Get controllable resources
      const controllableResources = await this.getStackControllableResources(accountId, stackName);
      
      // Filter to only resources that can be stopped
      const resourcesToStop = controllableResources.resources.filter(resource => 
        resource.canStop && (resourceIds.length === 0 || resourceIds.includes(resource.physicalResourceId))
      );

      console.log(`⏹️ Stopping ${resourcesToStop.length} resources`);

      const results = await Promise.all(
        resourcesToStop.map(async (resource) => {
          try {
            if (resource.resourceType === 'AWS::EC2::Instance') {
              const stopCommand = new StopInstancesCommand({
                InstanceIds: [resource.physicalResourceId]
              });
              await ec2Client.send(stopCommand);
              return { resourceId: resource.physicalResourceId, action: 'stop', status: 'success' };
            } else if (resource.resourceType === 'AWS::RDS::DBInstance') {
              const stopCommand = new StopDBInstanceCommand({
                DBInstanceIdentifier: resource.physicalResourceId
              });
              await rdsClient.send(stopCommand);
              return { resourceId: resource.physicalResourceId, action: 'stop', status: 'success' };
            } else if (resource.resourceType === 'AWS::RDS::DBCluster') {
              const stopCommand = new StopDBClusterCommand({
                DBClusterIdentifier: resource.physicalResourceId
              });
              await rdsClient.send(stopCommand);
              return { resourceId: resource.physicalResourceId, action: 'stop', status: 'success' };
            } else if (resource.resourceType === 'AWS::ECS::Service') {
              // For ECS, set desired count to 0
              const clusterArn = resource.physicalResourceId.split('/')[0];
              const serviceName = resource.physicalResourceId.split('/')[1];
              
              const updateCommand = new UpdateServiceCommand({
                cluster: clusterArn,
                service: serviceName,
                desiredCount: 0
              });
              await ecsClient.send(updateCommand);
              return { resourceId: resource.physicalResourceId, action: 'stop', status: 'success' };
            }
            return { resourceId: resource.physicalResourceId, action: 'stop', status: 'not_implemented' };
          } catch (error) {
            console.log(`❌ Failed to stop ${resource.physicalResourceId}: ${error.message}`);
            return { resourceId: resource.physicalResourceId, action: 'stop', status: 'error', error: error.message };
          }
        })
      );

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        action: 'stop',
        results: results
      };
    } catch (error) {
      console.error(`❌ Failed to stop resources for stack ${stackName}:`, error.message);
      throw new Error(`Failed to stop resources: ${error.message}`);
    }
  }

  async getStackCostAnalysis(accountId, stackName, startDate, endDate, granularity = 'DAILY', groupBy = 'SERVICE') {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`💰 Fetching cost analysis for stack: ${stackName} from ${startDate} to ${endDate}`);
      
      // Get credentials for the specific account
      let costExplorerClient = this.costExplorerClient;
      
      if (accountId) {
        const configPath = join(__dirname, '../config/accounts.json');
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        const accountConfig = config.accounts[accountId];
        
        if (accountConfig) {
          const { credentials, region } = await this.getCredentialsForAccount(accountId, accountConfig);
          costExplorerClient = new CostExplorerClient({ credentials, region });
        }
      }

      // Format dates for Cost Explorer API
      const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
      const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

      // Define grouping dimensions
      const groupByDimensions = [];
      if (groupBy === 'SERVICE') {
        groupByDimensions.push({ Type: 'DIMENSION', Key: 'SERVICE' });
      } else if (groupBy === 'RESOURCE_ID') {
        groupByDimensions.push({ Type: 'DIMENSION', Key: 'RESOURCE_ID' });
      } else if (groupBy === 'USAGE_TYPE') {
        groupByDimensions.push({ Type: 'DIMENSION', Key: 'USAGE_TYPE' });
      }

      // Get cost data filtered by CloudFormation stack tag
      const stackTaggedCostCommand = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: formattedStartDate,
          End: formattedEndDate
        },
        Granularity: granularity,
        Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
        GroupBy: groupByDimensions,
        Filter: {
          Tags: {
            Key: 'aws:cloudformation:stack-name',
            Values: [stackName],
            MatchOptions: ['EQUALS']
          }
        }
      });

      const stackCostResponse = await costExplorerClient.send(stackTaggedCostCommand);

      // Process and format the cost data
      const processedData = this.processCostData(stackCostResponse.ResultsByTime || [], groupBy);
      
      // Get total costs
      const totalCosts = this.calculateTotalCosts(stackCostResponse.ResultsByTime || []);

      console.log(`💰 Found cost data for ${processedData.length} time periods`);

      return {
        success: true,
        accountId: accountId,
        stackName: stackName,
        dateRange: {
          start: formattedStartDate,
          end: formattedEndDate
        },
        granularity: granularity,
        groupBy: groupBy,
        totalCosts: totalCosts,
        costData: processedData,
        resultsByTime: stackCostResponse.ResultsByTime || []
      };
    } catch (error) {
      console.error(`❌ Failed to get cost analysis for stack ${stackName}:`, error.message);
      
      // If it's a permissions error, return demo data
      if (error.message.includes('not authorized') || error.message.includes('AccessDenied')) {
        return this.getDemoCostData(stackName, startDate, endDate, granularity, groupBy);
      }
      
      throw new Error(`Failed to get cost analysis: ${error.message}`);
    }
  }

  processCostData(resultsByTime, groupBy) {
    return resultsByTime.map(result => {
      const timePeriod = result.TimePeriod;
      const groups = result.Groups || [];
      
      const groupedData = groups.map(group => {
        const keys = group.Keys || [];
        const metrics = group.Metrics || {};
        
        return {
          name: keys.join(' - ') || 'Unknown',
          blendedCost: parseFloat(metrics.BlendedCost?.Amount || '0'),
          unblendedCost: parseFloat(metrics.UnblendedCost?.Amount || '0'),
          usageQuantity: parseFloat(metrics.UsageQuantity?.Amount || '0'),
          unit: metrics.BlendedCost?.Unit || 'USD'
        };
      });

      return {
        date: timePeriod.Start,
        endDate: timePeriod.End,
        groups: groupedData,
        totalCost: groupedData.reduce((sum, group) => sum + group.blendedCost, 0)
      };
    });
  }

  calculateTotalCosts(resultsByTime) {
    let totalBlended = 0;
    let totalUnblended = 0;
    let totalUsage = 0;

    resultsByTime.forEach(result => {
      const groups = result.Groups || [];
      groups.forEach(group => {
        const metrics = group.Metrics || {};
        totalBlended += parseFloat(metrics.BlendedCost?.Amount || '0');
        totalUnblended += parseFloat(metrics.UnblendedCost?.Amount || '0');
        totalUsage += parseFloat(metrics.UsageQuantity?.Amount || '0');
      });
    });

    return {
      blendedCost: totalBlended,
      unblendedCost: totalUnblended,
      usageQuantity: totalUsage,
      currency: 'USD'
    };
  }

  getDemoCostData(stackName, startDate, endDate, granularity, groupBy) {
    console.log(`🎭 Returning demo cost data for stack ${stackName}`);
    
    // Generate demo data for the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const demoData = [];
    const services = ['Lambda', 'API Gateway', 'CloudFormation', 'S3', 'CloudWatch'];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const groups = services.map(service => ({
        name: service,
        blendedCost: Math.random() * 10 + 1, // Random cost between $1-$11
        unblendedCost: Math.random() * 10 + 1,
        usageQuantity: Math.random() * 100,
        unit: 'USD'
      }));
      
      demoData.push({
        date: dateStr,
        endDate: dateStr,
        groups: groups,
        totalCost: groups.reduce((sum, group) => sum + group.blendedCost, 0)
      });
    }

    return {
      success: true,
      accountId: accountId,
      stackName: stackName,
      dateRange: {
        start: startDate,
        end: endDate
      },
      granularity: granularity,
      groupBy: groupBy,
      totalCosts: {
        blendedCost: demoData.reduce((sum, day) => sum + day.totalCost, 0),
        unblendedCost: demoData.reduce((sum, day) => sum + day.totalCost, 0),
        usageQuantity: 1000,
        currency: 'USD'
      },
      costData: demoData,
      demoMode: true
    };
  }

  isInitialized() {
    return this.initialized;
  }
}

export default new AWSService(); 