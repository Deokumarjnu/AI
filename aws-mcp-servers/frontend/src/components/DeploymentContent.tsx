import React, { useState, useEffect } from 'react';
import DeployForm from './DeployForm';
import StackResources from './StackResources';
import ApiGatewayList from './ApiGatewayList';
import CloudWatchLogs from './CloudWatchLogs';
import ResourceControl from './ResourceControl';
import CostAnalysis from './CostAnalysis';

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
    { key: 'control', label: 'Start/Stop', color: 'text-gray-600' },
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
          <div>
            <ApiGatewayList selectedStack={selectedStack} />
          </div>
        );
      case 'logs':
        return (
          <div>
            <CloudWatchLogs selectedStack={selectedStack} />
          </div>
        );
      case 'control':
        return <ResourceControl selectedStack={selectedStack} />;
      case 'cost':
        return <CostAnalysis selectedStack={selectedStack} />;
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