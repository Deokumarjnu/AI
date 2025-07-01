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