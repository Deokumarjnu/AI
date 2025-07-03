import React, { useState, useEffect } from 'react';

interface CloudWatchLogsProps {
  selectedStack: string | null;
}

interface LogEvent {
  timestamp: string;
  message: string;
  ingestionTime: string;
}

interface LogGroup {
  logGroupName: string;
  logStreamName: string;
  creationTime: string | null;
  storedBytes: number;
  retentionInDays?: number;
  cloudFormationResource?: {
    logicalId: string;
    physicalId: string;
    resourceType: string;
    resourceStatus: string;
  };
  events: LogEvent[];
  error?: string;
}

interface CloudWatchLogsResponse {
  success: boolean;
  accountId: string;
  stackName: string;
  logGroupCount: number;
  logGroups: LogGroup[];
  message?: string;
  demoMode?: boolean;
}

const CloudWatchLogs: React.FC<CloudWatchLogsProps> = ({ selectedStack }) => {
  const [logs, setLogs] = useState<LogGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLogGroup, setSelectedLogGroup] = useState<string | null>(null);

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

  // Fetch CloudWatch logs for the current stack
  useEffect(() => {
    const fetchCloudWatchLogs = async () => {
      if (!accountId || !selectedStack) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/logs`
        );
        const data: CloudWatchLogsResponse = await response.json();

        if (data.success) {
          setLogs(data.logGroups || []);
          // Auto-expand first log group if there are any
          if (data.logGroups && data.logGroups.length > 0) {
            setExpandedGroups(new Set([data.logGroups[0].logGroupName]));
            setSelectedLogGroup(data.logGroups[0].logGroupName);
          }
        } else {
          setError(data.message || 'Failed to fetch CloudWatch logs');
        }
      } catch (error) {
        console.error('Failed to fetch CloudWatch logs:', error);
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchCloudWatchLogs();
  }, [accountId, selectedStack]);

  const toggleLogGroup = (logGroupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(logGroupName)) {
      newExpanded.delete(logGroupName);
    } else {
      newExpanded.add(logGroupName);
    }
    setExpandedGroups(newExpanded);
    setSelectedLogGroup(logGroupName);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getResourceTypeIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'AWS::Lambda::Function':
        return '⚡';
      case 'AWS::ApiGateway::RestApi':
        return '🌐';
      case 'AWS::ApiGateway::Stage':
        return '🎭';
      case 'Custom::LogRetention':
        return '📋';
      default:
        return '📦';
    }
  };

  const refreshLogs = () => {
    if (accountId && selectedStack) {
      // Re-trigger the effect by updating a dummy state
      setError(null);
      const fetchCloudWatchLogs = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/logs`
          );
          const data: CloudWatchLogsResponse = await response.json();
          if (data.success) {
            setLogs(data.logGroups || []);
          }
        } catch (error) {
          setError('Failed to refresh logs');
        } finally {
          setLoading(false);
        }
      };
      fetchCloudWatchLogs();
    }
  };

  if (!selectedStack) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold mb-2">Select a CloudFormation Stack</h2>
          <p>Choose a stack from the left sidebar to view CloudWatch logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">CloudWatch Logs</h2>
            <p className="text-gray-600">
              Logs for CloudFormation stack: <span className="font-medium text-blue-600">{selectedStack}</span>
            </p>
          </div>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading CloudWatch logs for stack {selectedStack}...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800 font-medium">Error loading CloudWatch logs</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No CloudWatch Logs Found</h3>
          <p className="text-gray-600">
            The CloudFormation stack <span className="font-medium">{selectedStack}</span> does not contain resources with CloudWatch logs.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Logs are shown for Lambda functions, API Gateway, and other AWS services that generate logs.
          </p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="space-y-4">
          {logs.map((logGroup) => (
            <div key={logGroup.logGroupName} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Log Group Header */}
              <div 
                className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleLogGroup(logGroup.logGroupName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {logGroup.cloudFormationResource && (
                        <span className="text-2xl">
                          {getResourceTypeIcon(logGroup.cloudFormationResource.resourceType)}
                        </span>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{logGroup.logGroupName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>Size: {formatBytes(logGroup.storedBytes)}</span>
                          {logGroup.retentionInDays && (
                            <span>Retention: {logGroup.retentionInDays} days</span>
                          )}
                          <span>{logGroup.events.length} recent events</span>
                        </div>
                      </div>
                    </div>
                    {logGroup.cloudFormationResource && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          CF: {logGroup.cloudFormationResource.logicalId}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          logGroup.cloudFormationResource.resourceStatus === 'CREATE_COMPLETE' || 
                          logGroup.cloudFormationResource.resourceStatus === 'UPDATE_COMPLETE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {logGroup.cloudFormationResource.resourceStatus}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedGroups.has(logGroup.logGroupName) ? 'rotate-90' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Log Events */}
              {expandedGroups.has(logGroup.logGroupName) && (
                <div className="p-4">
                  {logGroup.error ? (
                    <div className="text-red-600 text-sm">{logGroup.error}</div>
                  ) : logGroup.events.length === 0 ? (
                    <div className="text-gray-500 text-sm">No recent log events</div>
                  ) : (
                    <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                      <div className="space-y-1">
                        {logGroup.events.map((event, index) => (
                          <div key={index} className="break-all">
                            <span className="text-gray-500">[{formatTimestamp(event.timestamp)}]</span>
                            <span className="ml-2">{event.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CloudWatchLogs; 