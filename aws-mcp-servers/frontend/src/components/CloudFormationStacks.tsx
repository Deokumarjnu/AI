import React, { useState, useEffect } from 'react';
import awsService, { CloudFormationStack, StacksResponse } from '../services/awsService';

const CloudFormationStacks: React.FC = () => {
  const [stacks, setStacks] = useState<CloudFormationStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);

  useEffect(() => {
    fetchStacks();
  }, []);

  const fetchStacks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: StacksResponse = await awsService.getCloudFormationStacks();
      setStacks(response.stacks || []);
      setIsDemo(response.isDemo || false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch CloudFormation stacks');
      console.error('Error fetching stacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStackClick = async (stackName: string) => {
    if (selectedStack === stackName) {
      setSelectedStack(null);
      return;
    }

    try {
      setSelectedStack(stackName);
      // For demo mode, just show the selected state
      if (isDemo) {
        return;
      }

      // In real mode, fetch stack details
      const details = await awsService.getStackDetails(stackName);
      console.log('Stack details:', details);
    } catch (err: any) {
      console.error('Error fetching stack details:', err);
      setError(`Failed to fetch details for ${stackName}: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading CloudFormation stacks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Stacks</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchStacks}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CloudFormation Stacks</h2>
          <p className="text-gray-600 mt-1">
            {stacks.length} stack{stacks.length !== 1 ? 's' : ''} found
            {isDemo && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Demo Mode
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStacks}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stacks List */}
      {stacks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No CloudFormation stacks</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isDemo ? 'No demo stacks configured.' : 'No stacks found in your AWS account.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stacks.map((stack, index) => (
            <div
              key={`${stack.StackName}-${stack.StackStatus}-${index}`}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                selectedStack === stack.StackName ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
              onClick={() => handleStackClick(stack.StackName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">{stack.StackName}</h3>
                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      awsService.getStatusColor(stack.StackStatus).includes('green') ? 'bg-green-100 text-green-800' :
                      awsService.getStatusColor(stack.StackStatus).includes('blue') ? 'bg-blue-100 text-blue-800' :
                      awsService.getStatusColor(stack.StackStatus).includes('red') ? 'bg-red-100 text-red-800' :
                      awsService.getStatusColor(stack.StackStatus).includes('yellow') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stack.StackStatus}
                    </span>
                  </div>
                  
                  {stack.TemplateDescription && (
                    <p className="text-sm text-gray-600 mt-1">{stack.TemplateDescription}</p>
                  )}
                  
                  <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                    <span>Created: {awsService.formatDate(stack.CreationTime)}</span>
                    {stack.LastUpdatedTime && (
                      <span>Updated: {awsService.formatDate(stack.LastUpdatedTime)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedStack === stack.StackName ? 'rotate-90' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              {selectedStack === stack.StackName && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {isDemo ? (
                      <p>🎭 Demo mode - Click stack name to view details in real implementation</p>
                    ) : (
                      <p>Stack details would be loaded here...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CloudFormationStacks; 