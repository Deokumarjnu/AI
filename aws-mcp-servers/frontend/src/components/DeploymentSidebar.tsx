import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CloudFormationStack {
  name: string;
  status: string;
  creationTime: string;
}

interface AwsAccount {
  id: string;
  name: string;
  stacks: CloudFormationStack[];
}

interface DeploymentSidebarProps {
  selectedEnvironment: string | null;
  onEnvironmentSelect: (env: string) => void;
  selectedStack: string | null;
  onStackSelect: (stack: string) => void;
}

const DeploymentSidebar: React.FC<DeploymentSidebarProps> = ({
  selectedEnvironment,
  onEnvironmentSelect,
  selectedStack,
  onStackSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<{[key: string]: boolean}>({});
  const [awsAccounts, setAwsAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{name: string; company: string}>({
    name: 'User',
    company: 'AWS'
  });

  // Fetch AWS accounts and stacks
  useEffect(() => {
    const fetchAwsData = async () => {
      try {
        setLoading(true);
        
        // Fetch AWS identity and stacks
        const [identityResponse, stacksResponse] = await Promise.all([
          fetch('http://localhost:3002/api/aws/identity'),
          fetch('http://localhost:3002/api/aws/stacks')
        ]);

                 const identity = await identityResponse.json();
         const stacksData = await stacksResponse.json();

         // Extract user information from AWS identity
         if (identity.identity?.Arn) {
           const arnParts = identity.identity.Arn.split('/');
           const userEmail = arnParts[arnParts.length - 1]; // Gets "Deo.Kumar@powerschool.com"
           
           if (userEmail.includes('@')) {
             const [namePart, domain] = userEmail.split('@');
             const userName = namePart.replace('.', ' '); // "Deo.Kumar" -> "Deo Kumar"
             const company = domain.split('.')[0]; // "powerschool.com" -> "powerschool"
             const companyName = company.charAt(0).toUpperCase() + company.slice(1); // "PowerSchool"
             
             setUserInfo({
               name: userName,
               company: companyName
             });
           }
         }

         // Create account structure
         const account: AwsAccount = {
           id: identity.identity?.Account || 'unknown',
           name: identity.identity?.Arn ? identity.identity.Arn.split(':')[4] : 'AWS Account',
           stacks: (stacksData.stacks || []).map((stack: any) => ({
             name: stack.StackName,
             status: stack.StackStatus,
             creationTime: stack.CreationTime
           }))
         };

        setAwsAccounts([account]);
        
        // Auto-expand the first account
        setExpandedAccounts({ [account.id]: true });
        
        // Auto-select first stack if available
        if (account.stacks.length > 0 && !selectedStack) {
          onStackSelect(account.stacks[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch AWS data:', error);
        // Fallback to demo data
        const demoAccount: AwsAccount = {
          id: 'demo-account',
          name: 'Demo AWS Account',
          stacks: [
            { name: 'webapp-stack', status: 'CREATE_COMPLETE', creationTime: '2024-01-01' },
            { name: 'database-stack', status: 'UPDATE_COMPLETE', creationTime: '2024-01-02' },
            { name: 'api-stack', status: 'CREATE_COMPLETE', creationTime: '2024-01-03' }
          ]
        };
        setAwsAccounts([demoAccount]);
        setExpandedAccounts({ [demoAccount.id]: true });
      } finally {
        setLoading(false);
      }
    };

    fetchAwsData();
  }, [selectedStack, onStackSelect]);

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const getStatusColor = (status: string) => {
    if (status.includes('COMPLETE')) return 'bg-green-500';
    if (status.includes('IN_PROGRESS')) return 'bg-yellow-500';
    if (status.includes('FAILED')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const filteredAccounts = awsAccounts.map(account => ({
    ...account,
    stacks: account.stacks.filter(stack => 
      stack && stack.name && stack.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  return (
    <div className="w-[400px] min-w-[400px] max-w-[400px] bg-black text-white flex flex-col overflow-hidden">
      {/* Header with Black Knight Branding */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM9 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM9 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Black Knight</h1>
            <p className="text-gray-400 text-sm">{userInfo.company} AWS</p>
          </div>
        </div>

        {/* User Info */}
        <div className="text-sm text-gray-300">
          <span className="font-medium">{userInfo.name}</span> | <button className="text-blue-400 hover:text-blue-300">Log out</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-800">
        <input
          type="text"
          placeholder="Search stacks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* AWS Accounts & CloudFormation Stacks */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {loading ? (
            <div className="text-center text-gray-400 py-4">
              Loading AWS data...
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div key={account.id} className="mb-2">
                <button
                  onClick={() => toggleAccount(account.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                  <div>
                    <span className="font-medium">AWS Account</span>
                    <div className="text-xs text-gray-500">{account.id}</div>
                  </div>
                  {expandedAccounts[account.id] ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>

                {expandedAccounts[account.id] && (
                  <div className="ml-4 mt-1 space-y-1">
                    <div className="px-3 py-1 text-xs text-gray-500 font-medium">
                      CloudFormation Stacks ({account.stacks.length})
                    </div>
                    {account.stacks.map((stack) => (
                      <button
                        key={stack.name || 'unnamed-stack'}
                        onClick={() => stack.name && onStackSelect(stack.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-md transition-colors ${
                          selectedStack === stack.name 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{stack.name || 'Unnamed Stack'}</div>
                          <div className="text-xs text-gray-500">
                            {stack.creationTime ? new Date(stack.creationTime).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${getStatusColor(stack.status || 'unknown')}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </nav>
      </div>

      {/* Refresh Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => window.location.reload()}
          className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors text-sm"
        >
          🔄 Refresh AWS Data
        </button>
      </div>
    </div>
  );
};

export default DeploymentSidebar; 