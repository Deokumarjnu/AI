import React, { useState } from 'react';

interface DeployFormProps {
  selectedEnvironment: string | null;
  selectedStack: string | null;
}

const DeployForm: React.FC<DeployFormProps> = ({ selectedEnvironment, selectedStack }) => {
  const [branch, setBranch] = useState('master');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!selectedStack) return;
    
    setIsDeploying(true);
    // Simulate CloudFormation stack update
    setTimeout(() => {
      setIsDeploying(false);
      // This would normally trigger a stack update via the backend
    }, 3000);
  };

  if (!selectedStack) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 border-b border-gray-200 max-w-full overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Deploy CloudFormation Stack</h3>
      
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stack Name
          </label>
          <input
            type="text"
            value={selectedStack}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Git Branch/Tag
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Enter branch or tag name"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
      
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <button
          onClick={handleDeploy}
          disabled={isDeploying || !branch.trim()}
          className={`w-full sm:w-auto px-6 py-2 rounded-md font-medium transition-colors text-sm ${
            isDeploying || !branch.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isDeploying ? 'Updating Stack...' : 'Update Stack'}
        </button>
      </div>
      
      <div className="mt-3 text-sm text-gray-600">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="break-words">Stack: <span className="font-medium text-gray-900">{selectedStack}</span></span>
          {selectedEnvironment && (
            <span>Environment: <span className="font-medium text-gray-900">{selectedEnvironment}</span></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeployForm; 