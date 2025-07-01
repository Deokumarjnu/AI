import React, { useState, useEffect } from 'react';
import awsService, { CloudFormationStack, AWSIdentity } from '../services/awsService';

interface StackSidebarProps {
  onStackSelect: (stackName: string) => void;
  selectedStack: string | null;
}

const StackSidebar: React.FC<StackSidebarProps> = ({ onStackSelect, selectedStack }) => {
  const [stacks, setStacks] = useState<CloudFormationStack[]>([]);
  const [identity, setIdentity] = useState<AWSIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch identity and stacks in parallel
      const [identityResponse, stacksResponse] = await Promise.allSettled([
        awsService.getAWSIdentity(),
        awsService.getCloudFormationStacks()
      ]);

      // Handle identity
      if (identityResponse.status === 'fulfilled') {
        setIdentity(identityResponse.value);
      }

      // Handle stacks
      if (stacksResponse.status === 'fulfilled') {
        const activeStacks = stacksResponse.value.stacks.filter(
          stack => stack.StackStatus !== 'DELETE_COMPLETE'
        );
        setStacks(activeStacks);
        setIsDemo(stacksResponse.value.isDemo || false);
        
        // Auto-select first stack
        if (activeStacks.length > 0 && !selectedStack) {
          onStackSelect(activeStacks[0].StackName);
        }
      } else {
        throw new Error('Failed to fetch stacks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AWS data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = () => {
    if (isDemo) return 'Demo Account';
    if (identity?.identity?.Account) {
      return `Account ${identity.identity.Account}`;
    }
    return 'AWS Account';
  };

  const getAccountSubtitle = () => {
    if (isDemo) return 'Demo Mode';
    if (identity?.identity?.Arn) {
      const parts = identity.identity.Arn.split('/');
      return parts[parts.length - 1] || 'User';
    }
    return 'Loading...';
  };

  return (
    <div className="bg-black text-white h-screen flex flex-col" style={{ width: '400px' }}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-white flex items-center justify-center mr-4 relative" style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }}>
            <div className="w-6 h-6 bg-black" style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}></div>
          </div>
          <div>
            <h1 className="text-white text-xl font-semibold">Black Knight</h1>
            <p className="text-gray-400 text-sm">from Powerschool</p>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="p-6 border-b border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-800 p-3 rounded-md transition-colors"
        >
          <div>
            <h2 className="text-lg font-medium text-white">{getAccountName()}</h2>
            <p className="text-sm text-gray-400">{getAccountSubtitle()}</p>
            {isDemo && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-600 text-yellow-100 mt-1">
                Demo Mode
              </span>
            )}
          </div>
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Stacks List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-3"></div>
            <p className="text-gray-400">Loading stacks...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200 text-sm">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !isExpanded ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">Click account to expand stacks</p>
          </div>
        ) : stacks.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-400">No active stacks found</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide px-2 py-1">
              CloudFormation Stacks ({stacks.length})
            </div>
            {stacks.map((stack, index) => (
              <button
                key={`${stack.StackName}-${index}`}
                onClick={() => onStackSelect(stack.StackName)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedStack === stack.StackName
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stack.StackName}</p>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        stack.StackStatus.includes('COMPLETE') && !stack.StackStatus.includes('DELETE') ? 'bg-green-800 text-green-200' :
                        stack.StackStatus.includes('PROGRESS') ? 'bg-blue-800 text-blue-200' :
                        stack.StackStatus.includes('FAILED') ? 'bg-red-800 text-red-200' :
                        'bg-yellow-800 text-yellow-200'
                      }`}>
                        {stack.StackStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={fetchData}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Stacks
        </button>
      </div>
    </div>
  );
};

export default StackSidebar; 