import React, { useState, useEffect } from 'react';

interface ApiGatewayListProps {
  selectedStack: string | null;
}

interface ApiStage {
  stageName: string;
  deploymentId: string;
  description?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  cacheClusterEnabled?: boolean;
  cacheClusterSize?: string;
  variables?: { [key: string]: string };
  documentationVersion?: string;
  tracingConfig?: any;
  webAclArn?: string;
  tags?: { [key: string]: string };
}

interface ApiResource {
  id: string;
  parentId?: string;
  pathPart?: string;
  path: string;
  resourceMethods: string[];
}

interface ApiGatewayApi {
  id: string;
  name: string;
  description?: string;
  createdDate?: string;
  version?: string;
  stages: ApiStage[];
  resources: ApiResource[];
  endpointConfiguration?: any;
  apiKeySource?: string;
  minimumCompressionSize?: number;
  tags?: { [key: string]: string };
  error?: string;
  cloudFormationLogicalId?: string;
  cloudFormationResourceStatus?: string;
}

const ApiGatewayList: React.FC<ApiGatewayListProps> = ({ selectedStack }) => {
  const [apis, setApis] = useState<ApiGatewayApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

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

  // Fetch API Gateway APIs for the current account
  useEffect(() => {
    const fetchApiGatewayApis = async () => {
      if (!accountId || !selectedStack) return;

      try {
        setLoading(true);
        setError(null);

        // Use the new stack-specific endpoint
        const response = await fetch(`http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/api-gateway`);
        const data = await response.json();

        if (data.success) {
          setApis(data.apis || []);
        } else {
          setError(data.error || 'Failed to fetch API Gateway APIs');
        }
      } catch (error) {
        console.error('Failed to fetch API Gateway APIs:', error);
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchApiGatewayApis();
  }, [accountId, selectedStack]); // Added selectedStack as dependency

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getEndpointUrl = (api: ApiGatewayApi, stage: ApiStage) => {
    // Construct API Gateway endpoint URL
    const region = 'us-east-1'; // You might want to get this dynamically
    return `https://${api.id}.execute-api.${region}.amazonaws.com/${stage.stageName}`;
  };

  if (!selectedStack) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold mb-2">Select a CloudFormation Stack</h2>
          <p>Choose a stack from the left sidebar to view related API Gateway APIs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">API Gateway APIs</h2>
        <p className="text-gray-600">
          APIs created by CloudFormation stack: <span className="font-medium text-blue-600">{selectedStack}</span>
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading API Gateway APIs for stack {selectedStack}...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800 font-medium">Error loading API Gateway APIs</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {!loading && !error && apis.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No API Gateway APIs Found</h3>
          <p className="text-gray-600">
            The CloudFormation stack <span className="font-medium">{selectedStack}</span> does not contain any API Gateway REST APIs.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            APIs are only shown if they were created as part of this CloudFormation stack.
          </p>
        </div>
      )}

      {!loading && !error && apis.length > 0 && (
        <div className="space-y-6">
          {apis.map((api) => (
            <div key={api.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* API Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{api.name}</h3>
                      {api.cloudFormationLogicalId && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          CF: {api.cloudFormationLogicalId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">API ID: {api.id}</p>
                    {api.description && (
                      <p className="text-gray-700 mb-3">{api.description}</p>
                    )}
                    {api.cloudFormationResourceStatus && (
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-sm text-gray-500">CloudFormation Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          api.cloudFormationResourceStatus === 'CREATE_COMPLETE' || api.cloudFormationResourceStatus === 'UPDATE_COMPLETE'
                            ? 'bg-green-100 text-green-800'
                            : api.cloudFormationResourceStatus.includes('PROGRESS')
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {api.cloudFormationResourceStatus}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {formatDate(api.createdDate)}</span>
                      {api.version && <span>Version: {api.version}</span>}
                      <span>{api.stages.length} stage(s)</span>
                      <span>{api.resources?.length || 0} path(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      REST API
                    </span>
                  </div>
                </div>
              </div>

              {/* API Paths */}
              <div className="p-6 border-b border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">API Paths</h4>
                {!api.resources || api.resources.length === 0 ? (
                  <p className="text-gray-500 text-sm">No paths found</p>
                ) : (
                  <div className="space-y-2">
                    {api.resources
                      .filter(resource => resource.path !== '/') // Filter out root path
                      .sort((a, b) => a.path.localeCompare(b.path))
                      .map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                            {resource.path}
                          </code>
                          <div className="flex space-x-1">
                            {resource.resourceMethods.map((method) => (
                              <span
                                key={method}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                  method === 'POST' ? 'bg-green-100 text-green-800' :
                                  method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                  method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                  method === 'PATCH' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Stages */}
              <div className="p-6">
                <h4 className="font-medium text-gray-900 mb-4">Deployment Stages</h4>
                {api.stages.length === 0 ? (
                  <p className="text-gray-500 text-sm">No stages deployed</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {api.stages.map((stage) => (
                      <div key={stage.stageName} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">{stage.stageName}</h5>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Active
                          </span>
                        </div>
                        
                        {stage.description && (
                          <p className="text-sm text-gray-600 mb-3">{stage.description}</p>
                        )}
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Endpoint URL:</span>
                            <div className="mt-1">
                              <a 
                                href={getEndpointUrl(api, stage)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 break-all"
                              >
                                {getEndpointUrl(api, stage)}
                              </a>
                            </div>
                          </div>
                          
                          {stage.deploymentId && (
                            <div>
                              <span className="font-medium text-gray-700">Deployment ID:</span>
                              <span className="ml-2 text-gray-600">{stage.deploymentId}</span>
                            </div>
                          )}
                          
                          {stage.lastUpdatedDate && (
                            <div>
                              <span className="font-medium text-gray-700">Last Updated:</span>
                              <span className="ml-2 text-gray-600">{formatDate(stage.lastUpdatedDate)}</span>
                            </div>
                          )}
                          
                          {stage.cacheClusterEnabled && (
                            <div>
                              <span className="font-medium text-gray-700">Cache:</span>
                              <span className="ml-2 text-gray-600">
                                Enabled ({stage.cacheClusterSize})
                              </span>
                            </div>
                          )}
                        </div>

                        {stage.variables && Object.keys(stage.variables).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="font-medium text-gray-700 text-sm">Stage Variables:</span>
                            <div className="mt-1 space-y-1">
                              {Object.entries(stage.variables).map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                  <span className="font-medium text-gray-600">{key}:</span>
                                  <span className="ml-1 text-gray-500">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-3">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      📋 View Resources
                    </button>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      📊 View Metrics
                    </button>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      📝 View Logs
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Account: {accountId}
                  </div>
                </div>
              </div>

              {api.error && (
                <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-200">
                  <div className="text-yellow-800 text-sm">
                    ⚠️ {api.error}
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

export default ApiGatewayList; 