import dotenv from 'dotenv';
import AWSMCPClient from './src/mcp-client.js';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing AWS MCP Connection...');
  console.log('📋 Environment Variables:');
  console.log('- AWS_DEFAULT_REGION:', process.env.AWS_DEFAULT_REGION);
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('- AWS_PROFILE:', process.env.AWS_PROFILE || 'Not set');
  console.log('');

  try {
    console.log('🔄 Creating MCP Client...');
    const mcpClient = new AWSMCPClient();
    
    console.log('🔗 Connecting to MCP Server...');
    await mcpClient.connect();
    
    console.log('✅ MCP Client connected successfully!');
    
    console.log('🔐 Testing AWS Identity...');
    const identity = await mcpClient.getCallerIdentity();
    console.log('AWS Identity:', identity);
    
    console.log('📦 Testing CloudFormation Stacks...');
    const stacks = await mcpClient.listCloudFormationStacks();
    console.log('CloudFormation Stacks:', stacks);
    
    console.log('🔌 Disconnecting...');
    await mcpClient.disconnect();
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testConnection(); 