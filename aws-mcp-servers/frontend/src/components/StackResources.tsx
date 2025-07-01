import React, { useState, useEffect } from 'react';
import awsService, { StackResource } from '../services/awsService';

interface StackResourcesProps {
  stackName: string | null;
}

const StackResources: React.FC<StackResourcesProps> = ({ stackName }) => {
  const [resources, setResources] = useState<StackResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stackName) {
      fetchResources(stackName);
    } else {
      setResources([]);
      setError(null);
    }
  }, [stackName]);

  const fetchResources = async (stack: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await awsService.getStackResources(stack);
      setResources(response.resources || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stack resources');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!stackName) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium mb-2">Select a Stack</h3>
          <p>Choose a CloudFormation stack from the left to view its resources</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading resources for {stackName}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Resources</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => fetchResources(stackName)}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stackName}</h2>
            <p className="text-gray-600 mt-1">
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => fetchResources(stackName)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Resources List */}
      <div className="flex-1 overflow-y-auto">
        {resources.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Resources Found</h3>
            <p className="text-gray-500">This stack doesn't have any resources or they couldn't be loaded.</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {resources.map((resource, index) => (
              <div
                key={`${resource.LogicalResourceId}-${index}`}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">
                        {awsService.getResourceTypeIcon(resource.ResourceType)}
                      </span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {resource.LogicalResourceId}
                        </h3>
                        <p className="text-sm text-gray-500">{resource.ResourceType}</p>
                      </div>
                    </div>

                    {resource.PhysicalResourceId && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Physical ID:</span>
                        <p className="text-sm text-gray-600 font-mono break-all">
                          {resource.PhysicalResourceId}
                        </p>
                      </div>
                    )}

                    {resource.Description && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-sm text-gray-600">{resource.Description}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        awsService.getResourceStatusColor(resource.ResourceStatus).includes('green') ? 'bg-green-100 text-green-800' :
                        awsService.getResourceStatusColor(resource.ResourceStatus).includes('blue') ? 'bg-blue-100 text-blue-800' :
                        awsService.getResourceStatusColor(resource.ResourceStatus).includes('red') ? 'bg-red-100 text-red-800' :
                        awsService.getResourceStatusColor(resource.ResourceStatus).includes('yellow') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {resource.ResourceStatus}
                      </span>
                      
                      {resource.Timestamp && (
                        <span className="text-xs text-gray-500">
                          {awsService.formatDate(resource.Timestamp)}
                        </span>
                      )}
                    </div>

                    {resource.ResourceStatusReason && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {resource.ResourceStatusReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StackResources; 