import { CloudFormationClient, ListStacksCommand, DescribeStacksCommand, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';

dotenv.config();

class AWSService {
  constructor() {
    this.cloudFormationClient = null;
    this.stsClient = null;
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

  async getCallerIdentity() {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      const command = new GetCallerIdentityCommand({});
      const response = await this.stsClient.send(command);

      return {
        success: true,
        identity: {
          Account: response.Account,
          Arn: response.Arn,
          UserId: response.UserId
        }
      };
    } catch (error) {
      throw new Error(`Failed to get caller identity: ${error.message}`);
    }
  }

  async listCloudFormationStacks(options = {}) {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }

    try {
      const input = {};
      
      if (options.stackStatusFilter && options.stackStatusFilter.length > 0) {
        input.StackStatusFilter = options.stackStatusFilter;
      }

      const command = new ListStacksCommand(input);
      const response = await this.cloudFormationClient.send(command);

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

  isInitialized() {
    return this.initialized;
  }
}

export default new AWSService(); 