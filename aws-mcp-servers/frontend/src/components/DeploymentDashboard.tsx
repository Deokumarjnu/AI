import React, { useState } from 'react';
import DeploymentSidebar from './DeploymentSidebar';
import DeploymentContent from './DeploymentContent';

const DeploymentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('deploy');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Black Sidebar */}
      <DeploymentSidebar 
        selectedEnvironment={selectedEnvironment}
        onEnvironmentSelect={setSelectedEnvironment}
        selectedStack={selectedStack}
        onStackSelect={setSelectedStack}
      />

      {/* Right Content Area */}
      <div className="flex-1 bg-white">
        <DeploymentContent 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedEnvironment={selectedEnvironment}
          selectedStack={selectedStack}
        />
      </div>
    </div>
  );
};

export default DeploymentDashboard; 