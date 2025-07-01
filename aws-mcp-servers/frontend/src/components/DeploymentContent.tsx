import React, { useState, useEffect } from 'react';
import DeployForm from './DeployForm';
import StackResources from './StackResources';

interface DeploymentContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedEnvironment: string | null;
  selectedStack: string | null;
}

const DeploymentContent: React.FC<DeploymentContentProps> = ({
  activeTab,
  onTabChange,
  selectedEnvironment,
  selectedStack
}) => {
  const tabs = [
    { key: 'deploy', label: 'Deploy', color: 'text-blue-600' },
    { key: 'resources', label: 'Resources', color: 'text-gray-600' },
    { key: 'apis', label: 'AWS APIs', color: 'text-gray-600' },
    { key: 'logs', label: 'Logs', color: 'text-gray-600' },
    { key: 'dispose', label: 'Dispose', color: 'text-gray-600' },
    { key: 'cost', label: 'Cost Analysis', color: 'text-gray-600' }
  ];

  const renderTabContent = () => {
    if (!selectedStack) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">☁️</div>
            <h2 className="text-xl font-semibold mb-2">Select a CloudFormation Stack</h2>
            <p>Choose a stack from the left sidebar to manage deployments and resources</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'deploy':
        return (
          <div>
            <DeployForm selectedEnvironment={selectedEnvironment} selectedStack={selectedStack} />
          </div>
        );
      case 'resources':
        return (
          <div>
            <StackResources stackName={selectedStack} />
          </div>
        );
      case 'apis':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">AWS APIs for {selectedStack}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-gray-900 mb-2">CloudFormation</h3>
                <div className="space-y-2 text-sm">
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">describe-stacks</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">list-stack-resources</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">get-template</button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-gray-900 mb-2">EC2</h3>
                <div className="space-y-2 text-sm">
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">describe-instances</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">describe-security-groups</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">describe-volumes</button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-gray-900 mb-2">S3</h3>
                <div className="space-y-2 text-sm">
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">list-buckets</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">get-bucket-policy</button>
                  <button className="block w-full text-left text-blue-600 hover:text-blue-800">list-objects</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">CloudFormation Events for {selectedStack}</h2>
            <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              <div className="space-y-1">
                <div>[2024-01-01 10:30:45] Stack {selectedStack} - CREATE_IN_PROGRESS</div>
                <div>[2024-01-01 10:30:46] Creating resource: AWS::S3::Bucket</div>
                <div>[2024-01-01 10:30:47] Creating resource: AWS::EC2::Instance</div>
                <div>[2024-01-01 10:30:50] Resource creation completed: AWS::S3::Bucket</div>
                <div>[2024-01-01 10:30:52] Resource creation completed: AWS::EC2::Instance</div>
                <div>[2024-01-01 10:30:53] Stack {selectedStack} - CREATE_COMPLETE ✓</div>
                <div>[2024-01-01 11:15:20] Stack update initiated...</div>
                <div>[2024-01-01 11:15:25] Updating resource: AWS::EC2::Instance</div>
                <div>[2024-01-01 11:15:30] Stack {selectedStack} - UPDATE_COMPLETE ✓</div>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                🔄 Refresh Logs
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                📥 Download Logs
              </button>
            </div>
          </div>
        );
      case 'dispose':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Dispose Stack: {selectedStack}</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Warning: Stack Deletion
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This action will permanently delete the CloudFormation stack and all its resources. This cannot be undone.</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex space-x-3">
                      <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium">
                        🗑️ Delete Stack
                      </button>
                      <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cost':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Cost Analysis for {selectedStack}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Monthly Cost</h3>
                <p className="text-2xl font-bold text-green-600">$127.45</p>
                <p className="text-sm text-gray-500">Current month</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Daily Average</h3>
                <p className="text-2xl font-bold text-blue-600">$4.25</p>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Projected</h3>
                <p className="text-2xl font-bold text-orange-600">$152.18</p>
                <p className="text-sm text-gray-500">End of month</p>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Cost Breakdown by Service</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EC2 Instances</span>
                  <span className="font-medium">$89.32 (70%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">S3 Storage</span>
                  <span className="font-medium">$23.45 (18%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">RDS Database</span>
                  <span className="font-medium">$12.67 (10%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Other Services</span>
                  <span className="font-medium">$2.01 (2%)</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex space-x-8 px-6 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative pb-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? tab.color + ' border-b-2 border-current'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {selectedStack && (
          <div className="px-6 pb-3">
            <div className="text-sm text-gray-600">
              Managing stack: <span className="font-medium text-gray-900">{selectedStack}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DeploymentContent; 