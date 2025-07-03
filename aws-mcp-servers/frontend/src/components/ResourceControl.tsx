import React, { useState, useEffect } from 'react';

interface ResourceControlProps {
  selectedStack: string | null;
}

interface ControllableResource {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  currentStatus: string;
  canStart: boolean;
  canStop: boolean;
  details: {
    [key: string]: any;
  };
  error?: string;
}

interface ResourceControlResponse {
  success: boolean;
  accountId: string;
  stackName: string;
  resourceCount: number;
  resources: ControllableResource[];
  demoMode?: boolean;
  message?: string;
  error?: string;
}

interface ActionResult {
  resourceId: string;
  action: string;
  status: string;
  error?: string;
}

const ResourceControl: React.FC<ResourceControlProps> = ({ selectedStack }) => {
  const [resources, setResources] = useState<ControllableResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);

  // Get current account ID from the identity API
  useEffect(() => {
    const fetchAccountId = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/aws/identity');
        const data = await response.json();
        if (data.success && data.identity?.Account) {
          setAccountId(data.identity.Account);
        }
      } catch (error) {
        console.error('Failed to get account ID:', error);
      }
    };

    fetchAccountId();
  }, []);

  // Fetch controllable resources for the current stack
  useEffect(() => {
    const fetchControllableResources = async () => {
      if (!accountId || !selectedStack) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/controllable-resources`
        );
        const data: ResourceControlResponse = await response.json();

        if (data.success) {
          setResources(data.resources || []);
        } else {
          setError(data.message || data.error || 'Failed to fetch controllable resources');
        }
      } catch (error) {
        console.error('Failed to fetch controllable resources:', error);
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchControllableResources();
  }, [accountId, selectedStack]);

  const performAction = async (action: 'start' | 'stop', resourceIds?: string[]) => {
    if (!accountId || !selectedStack) return;

    try {
      setActionLoading(action);
      setActionResults([]);
      setError(null);

      const response = await fetch(
        `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resourceIds: resourceIds || [] }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionResults(data.results || []);
        // Refresh the resources to get updated status
        setTimeout(() => {
          fetchControllableResources();
        }, 2000);
      } else {
        setError(data.error || `Failed to ${action} resources`);
      }
    } catch (error) {
      console.error(`Failed to ${action} resources:`, error);
      setError(`Failed to ${action} resources`);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchControllableResources = async () => {
    if (!accountId || !selectedStack) return;

    try {
      const response = await fetch(
        `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/controllable-resources`
      );
      const data: ResourceControlResponse = await response.json();

      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Failed to refresh resources:', error);
    }
  };

  const getResourceTypeIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'AWS::EC2::Instance':
        return '🖥️';
      case 'AWS::RDS::DBInstance':
        return '🗄️';
      case 'AWS::RDS::DBCluster':
        return '🗃️';
      case 'AWS::ECS::Service':
        return '📦';
      case 'AWS::AutoScaling::AutoScalingGroup':
        return '⚖️';
      default:
        return '🔧';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'stopped':
      case 'stopping':
        return 'bg-red-100 text-red-800';
      case 'starting':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canStartAny = resources.some(r => r.canStart);
  const canStopAny = resources.some(r => r.canStop);

  if (!selectedStack) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🎛️</div>
          <h2 className="text-xl font-semibold mb-2">Select a CloudFormation Stack</h2>
          <p>Choose a stack from the left sidebar to manage its resources</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Resource Control</h2>
            <p className="text-gray-600">
              Start and stop resources in stack: <span className="font-medium text-blue-600">{selectedStack}</span>
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => performAction('start')}
              disabled={!canStartAny || actionLoading !== null}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m2-7H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z" />
              </svg>
              {actionLoading === 'start' ? 'Starting...' : 'Start All'}
            </button>
            <button
              onClick={() => performAction('stop')}
              disabled={!canStopAny || actionLoading !== null}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
              </svg>
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop All'}
            </button>
            <button
              onClick={() => fetchControllableResources()}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading controllable resources for stack {selectedStack}...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {actionResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-blue-800 font-medium mb-2">Action Results</div>
          <div className="space-y-1">
            {actionResults.map((result, index) => (
              <div key={index} className="text-sm">
                <span className="font-mono">{result.resourceId}</span>: 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status} {result.action}
                </span>
                {result.error && <span className="text-red-600 ml-2">({result.error})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && resources.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🎛️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Controllable Resources Found</h3>
          <p className="text-gray-600">
            The CloudFormation stack <span className="font-medium">{selectedStack}</span> does not contain controllable resources.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Controllable resources include EC2 instances, RDS databases, and ECS services.
          </p>
        </div>
      )}

      {!loading && !error && resources.length > 0 && (
        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.physicalResourceId} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{getResourceTypeIcon(resource.resourceType)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{resource.logicalResourceId}</h3>
                        <p className="text-sm text-gray-500">{resource.resourceType}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Physical ID:</span>
                      <p className="text-sm text-gray-600 font-mono break-all">{resource.physicalResourceId}</p>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(resource.currentStatus)}`}>
                        {resource.currentStatus}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resource.resourceStatus === 'CREATE_COMPLETE' || resource.resourceStatus === 'UPDATE_COMPLETE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        CF: {resource.resourceStatus}
                      </span>
                    </div>

                    {Object.keys(resource.details).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(resource.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-600">{key}:</span>
                              <span className="ml-1 font-medium">{value || 'N/A'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resource.error && (
                      <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                        {resource.error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => performAction('start', [resource.physicalResourceId])}
                      disabled={!resource.canStart || actionLoading !== null}
                      className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ▶️ Start
                    </button>
                    <button
                      onClick={() => performAction('stop', [resource.physicalResourceId])}
                      disabled={!resource.canStop || actionLoading !== null}
                      className="bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceControl; 