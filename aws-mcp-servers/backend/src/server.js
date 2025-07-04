import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import awsService from './aws-service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Initialize AWS service
let awsInitialized = false;

async function initializeAWS() {
  try {
    console.log('🔄 Initializing AWS Service...');
    awsInitialized = await awsService.initialize();
    if (awsInitialized) {
      console.log('✅ AWS Service connected successfully');
    } else {
      console.log('⚠️ AWS Service initialization failed - running in demo mode');
    }
  } catch (error) {
    console.error('❌ Failed to initialize AWS service:', error);
    awsInitialized = false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    awsConnected: awsInitialized,
    version: '1.0.0'
  });
});

// Get AWS caller identity
app.get('/api/aws/identity', async (req, res) => {
  try {
    if (!awsInitialized) {
      return res.status(503).json({
        success: false,
        error: 'AWS service not connected',
        message: 'AWS service is not available. Check your credentials and try again.'
      });
    }

    const identity = await awsService.getCallerIdentity();
    res.json(identity);
  } catch (error) {
    console.error('Error getting AWS identity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all configured AWS accounts with their stacks
app.get('/api/aws/accounts', async (req, res) => {
  try {
    if (!awsInitialized) {
      return res.status(503).json({
        success: false,
        error: 'AWS service not connected',
        message: 'AWS service is not available. Check your credentials and try again.'
      });
    }

    console.log('🏢 Fetching all configured AWS accounts...');
    const accounts = await awsService.getAllAccounts();
    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Error getting all accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List CloudFormation stacks
app.get('/api/aws/stacks', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Return demo data if AWS is not connected
      console.log('⚠️ AWS not connected - returning demo data');
      return res.json({
        success: true,
        stackCount: 3,
        stacks: [
          {
            StackName: 'demo-web-app-stack',
            StackStatus: 'CREATE_COMPLETE',
            CreationTime: new Date('2024-01-15T10:30:00Z').toISOString(),
            LastUpdatedTime: new Date('2024-01-20T14:45:00Z').toISOString(),
            TemplateDescription: 'Demo web application infrastructure'
          },
          {
            StackName: 'demo-database-stack',
            StackStatus: 'UPDATE_COMPLETE',
            CreationTime: new Date('2024-01-10T09:15:00Z').toISOString(),
            LastUpdatedTime: new Date('2024-01-25T16:20:00Z').toISOString(),
            TemplateDescription: 'Demo database resources'
          },
          {
            StackName: 'demo-monitoring-stack',
            StackStatus: 'CREATE_COMPLETE',
            CreationTime: new Date('2024-01-12T11:00:00Z').toISOString(),
            LastUpdatedTime: new Date('2024-01-18T13:30:00Z').toISOString(),
            TemplateDescription: 'Demo monitoring and logging infrastructure'
          }
        ],
        isDemo: true,
        message: 'Demo mode - configure AWS credentials in .env file to see real stacks'
      });
    }

    // Extract query parameters for filtering
    const { status, region } = req.query;
    const options = {};
    
    if (status) {
      options.stackStatusFilter = Array.isArray(status) ? status : [status];
    }
    
    if (region) {
      options.region = region;
    }

    console.log('📦 Fetching real CloudFormation stacks from AWS...');
    const result = await awsService.listCloudFormationStacks(options);
    console.log(`✅ Found ${result.stackCount} stacks`);
    res.json(result);
  } catch (error) {
    console.error('Error listing CloudFormation stacks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific stack details
app.get('/api/aws/stacks/:stackName', async (req, res) => {
  try {
    if (!awsInitialized) {
      return res.status(503).json({
        success: false,
        error: 'AWS service not connected',
        message: 'AWS service is not available. Check your credentials and try again.'
      });
    }

    const { stackName } = req.params;
    console.log(`📋 Fetching details for stack: ${stackName}`);
    const result = await awsService.describeCloudFormationStack(stackName);
    res.json(result);
  } catch (error) {
    console.error(`Error describing stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get stack resources
app.get('/api/aws/stacks/:stackName/resources', async (req, res) => {
  try {
    if (!awsInitialized) {
      return res.status(503).json({
        success: false,
        error: 'AWS service not connected',
        message: 'AWS service is not available. Check your credentials and try again.'
      });
    }

    const { stackName } = req.params;
    console.log(`📋 Fetching resources for stack: ${stackName}`);
    const result = await awsService.getStackResources(stackName);
    console.log(`✅ Found ${result.resourceCount} resources`);
    res.json(result);
  } catch (error) {
    console.error(`Error getting resources for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get API Gateway APIs for a specific account
app.get('/api/aws/accounts/:accountId/api-gateway', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        apiCount: 2,
        apis: [
          {
            id: 'demo-api-1',
            name: 'Demo User API',
            description: 'Demo API for user management',
            createdDate: '2024-01-15T10:30:00Z',
            stages: [
              {
                stageName: 'prod',
                deploymentId: 'demo-deployment-1',
                description: 'Production stage'
              },
              {
                stageName: 'staging',
                deploymentId: 'demo-deployment-2',
                description: 'Staging environment'
              }
            ]
          },
          {
            id: 'demo-api-2',
            name: 'Demo Orders API',
            description: 'Demo API for order processing',
            createdDate: '2024-01-20T14:15:00Z',
            stages: [
              {
                stageName: 'prod',
                deploymentId: 'demo-deployment-3',
                description: 'Production stage'
              }
            ]
          }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId } = req.params;
    console.log(`🚀 Fetching API Gateway APIs for account: ${accountId}`);
    const result = await awsService.getApiGatewayApis(accountId);
    res.json(result);
  } catch (error) {
    console.error(`Error getting API Gateway APIs for account ${req.params.accountId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get API Gateway APIs for a specific CloudFormation stack
app.get('/api/aws/accounts/:accountId/stacks/:stackName/api-gateway', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo APIs for the specific stack
      const { stackName } = req.params;
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        apiCount: 1,
        apis: [
          {
            id: 'demo-stack-api-1',
            name: `${stackName} API`,
            description: `Demo API from CloudFormation stack ${stackName}`,
            createdDate: '2024-01-15T10:30:00Z',
            cloudFormationLogicalId: 'MyRestApi',
            cloudFormationResourceType: 'AWS::ApiGateway::RestApi',
            cloudFormationResourceStatus: 'CREATE_COMPLETE',
            resources: [
              {
                id: 'demo-resource-1',
                path: '/api',
                resourceMethods: ['GET', 'POST']
              },
              {
                id: 'demo-resource-2', 
                path: '/api/users',
                resourceMethods: ['GET', 'POST', 'PUT', 'DELETE']
              }
            ],
            stages: [
              {
                stageName: 'prod',
                deploymentId: 'demo-deployment-1',
                description: 'Production stage for stack API'
              }
            ]
          }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId, stackName } = req.params;
    console.log(`🚀 Fetching API Gateway APIs for stack: ${stackName} in account: ${accountId}`);
    const result = await awsService.getApiGatewayApisByStack(accountId, stackName);
    res.json(result);
  } catch (error) {
    console.error(`Error getting API Gateway APIs for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get CloudWatch logs for a specific CloudFormation stack
app.get('/api/aws/accounts/:accountId/stacks/:stackName/logs', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo logs for the specific stack
      const { stackName } = req.params;
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        logGroupCount: 2,
        logGroups: [
          {
            logGroupName: `/aws/lambda/${stackName}-function-1`,
            logStreamName: '2024/07/02/[$LATEST]abc123def456',
            creationTime: '2024-07-01T10:00:00.000Z',
            storedBytes: 1024576,
            retentionInDays: 14,
            cloudFormationResource: {
              logicalId: 'MyLambdaFunction',
              physicalId: `${stackName}-function-1`,
              resourceType: 'AWS::Lambda::Function',
              resourceStatus: 'CREATE_COMPLETE'
            },
            events: [
              {
                timestamp: '2024-07-02T10:30:00.000Z',
                message: 'START RequestId: 12345678-1234-1234-1234-123456789012 Version: $LATEST',
                ingestionTime: '2024-07-02T10:30:01.000Z'
              },
              {
                timestamp: '2024-07-02T10:30:01.000Z',
                message: 'Processing request for user authentication',
                ingestionTime: '2024-07-02T10:30:02.000Z'
              },
              {
                timestamp: '2024-07-02T10:30:02.000Z',
                message: 'Successfully authenticated user',
                ingestionTime: '2024-07-02T10:30:03.000Z'
              },
              {
                timestamp: '2024-07-02T10:30:03.000Z',
                message: 'END RequestId: 12345678-1234-1234-1234-123456789012',
                ingestionTime: '2024-07-02T10:30:04.000Z'
              }
            ]
          },
          {
            logGroupName: `/aws/apigateway/${stackName}`,
            logStreamName: 'api-gateway-execution-logs',
            creationTime: '2024-07-01T10:00:00.000Z',
            storedBytes: 2048576,
            retentionInDays: 30,
            cloudFormationResource: {
              logicalId: 'MyRestApi',
              physicalId: `${stackName}-api`,
              resourceType: 'AWS::ApiGateway::RestApi',
              resourceStatus: 'CREATE_COMPLETE'
            },
            events: [
              {
                timestamp: '2024-07-02T10:29:00.000Z',
                message: '{"requestId":"abc-123","ip":"192.168.1.1","httpMethod":"GET","path":"/api/users","status":200,"responseTime":45}',
                ingestionTime: '2024-07-02T10:29:01.000Z'
              },
              {
                timestamp: '2024-07-02T10:29:30.000Z',
                message: '{"requestId":"def-456","ip":"192.168.1.2","httpMethod":"POST","path":"/api/auth","status":200,"responseTime":123}',
                ingestionTime: '2024-07-02T10:29:31.000Z'
              }
            ]
          }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId, stackName } = req.params;
    console.log(`📋 Fetching CloudWatch logs for stack: ${stackName} in account: ${accountId}`);
    const result = await awsService.getStackCloudWatchLogs(accountId, stackName);
    res.json(result);
  } catch (error) {
    console.error(`Error getting CloudWatch logs for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get controllable resources for a specific CloudFormation stack
app.get('/api/aws/accounts/:accountId/stacks/:stackName/controllable-resources', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo controllable resources
      const { stackName } = req.params;
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        resourceCount: 2,
        resources: [
          {
            logicalResourceId: 'WebServerInstance',
            physicalResourceId: 'i-0123456789abcdef0',
            resourceType: 'AWS::EC2::Instance',
            resourceStatus: 'CREATE_COMPLETE',
            currentStatus: 'running',
            canStart: false,
            canStop: true,
            details: {
              instanceType: 't3.micro',
              publicIp: '203.0.113.123',
              privateIp: '10.0.1.100'
            }
          },
          {
            logicalResourceId: 'DatabaseInstance',
            physicalResourceId: 'mydb-instance',
            resourceType: 'AWS::RDS::DBInstance',
            resourceStatus: 'CREATE_COMPLETE',
            currentStatus: 'available',
            canStart: false,
            canStop: true,
            details: {
              engine: 'mysql',
              engineVersion: '8.0.35',
              dbInstanceClass: 'db.t3.micro'
            }
          }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId, stackName } = req.params;
    console.log(`🔍 Fetching controllable resources for stack: ${stackName} in account: ${accountId}`);
    const result = await awsService.getStackControllableResources(accountId, stackName);
    res.json(result);
  } catch (error) {
    console.error(`Error getting controllable resources for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start stack resources
app.post('/api/aws/accounts/:accountId/stacks/:stackName/start', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo start result
      const { stackName } = req.params;
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        action: 'start',
        results: [
          { resourceId: 'i-0123456789abcdef0', action: 'start', status: 'success' },
          { resourceId: 'mydb-instance', action: 'start', status: 'success' }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId, stackName } = req.params;
    const { resourceIds } = req.body; // Optional: specific resources to start
    
    console.log(`▶️ Starting resources for stack: ${stackName} in account: ${accountId}`);
    const result = await awsService.startStackResources(accountId, stackName, resourceIds);
    res.json(result);
  } catch (error) {
    console.error(`Error starting resources for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop stack resources
app.post('/api/aws/accounts/:accountId/stacks/:stackName/stop', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo stop result
      const { stackName } = req.params;
      const demoData = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        action: 'stop',
        results: [
          { resourceId: 'i-0123456789abcdef0', action: 'stop', status: 'success' },
          { resourceId: 'mydb-instance', action: 'stop', status: 'success' }
        ],
        demoMode: true
      };
      return res.json(demoData);
    }

    const { accountId, stackName } = req.params;
    const { resourceIds } = req.body; // Optional: specific resources to stop
    
    console.log(`⏹️ Stopping resources for stack: ${stackName} in account: ${accountId}`);
    const result = await awsService.stopStackResources(accountId, stackName, resourceIds);
    res.json(result);
  } catch (error) {
    console.error(`Error stopping resources for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cost analysis for a specific CloudFormation stack
app.get('/api/aws/accounts/:accountId/stacks/:stackName/cost-analysis', async (req, res) => {
  try {
    if (!awsInitialized) {
      // Demo mode - return demo cost analysis
      const { stackName } = req.params;
      const { startDate, endDate, granularity = 'DAILY', groupBy = 'SERVICE' } = req.query;
      
      // Generate demo data for the last 30 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const demoStartDate = startDate || defaultStartDate;
      const demoEndDate = endDate || defaultEndDate;
      
      const start = new Date(demoStartDate);
      const end = new Date(demoEndDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      const demoData = [];
      const services = ['Lambda', 'API Gateway', 'CloudFormation', 'S3', 'CloudWatch'];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const groups = services.map(service => ({
          name: service,
          blendedCost: Math.random() * 10 + 1,
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

      const demoResponse = {
        success: true,
        accountId: req.params.accountId,
        stackName: stackName,
        dateRange: {
          start: demoStartDate,
          end: demoEndDate
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
      
      return res.json(demoResponse);
    }

    const { accountId, stackName } = req.params;
    const { startDate, endDate, granularity = 'DAILY', groupBy = 'SERVICE' } = req.query;

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const queryStartDate = startDate || defaultStartDate;
    const queryEndDate = endDate || defaultEndDate;

    console.log(`💰 Fetching cost analysis for stack: ${stackName} from ${queryStartDate} to ${queryEndDate}`);
    const result = await awsService.getStackCostAnalysis(accountId, stackName, queryStartDate, queryEndDate, granularity, groupBy);
    res.json(result);
  } catch (error) {
    console.error(`Error getting cost analysis for stack ${req.params.stackName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test AWS connection endpoint
app.get('/api/aws/test', async (req, res) => {
  try {
    if (!awsInitialized) {
      return res.status(503).json({
        success: false,
        error: 'AWS service not connected'
      });
    }

    const identity = await awsService.getCallerIdentity();
    res.json({
      success: true,
      message: 'AWS connection successful',
      identity: identity.identity
    });
  } catch (error) {
    console.error('AWS connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize AWS connection
    await initializeAWS();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 API endpoint: http://localhost:${PORT}/api/aws/stacks`);
      console.log(`🧪 Test AWS: http://localhost:${PORT}/api/aws/test`);
      console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
      console.log('');
      if (awsInitialized) {
        console.log('✅ AWS connected - real CloudFormation stacks available');
      } else {
        console.log('⚠️ AWS not connected - demo mode active');
        console.log('💡 To connect to AWS:');
        console.log('   1. Update .env file with your AWS credentials');
        console.log('   2. Restart the server');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 