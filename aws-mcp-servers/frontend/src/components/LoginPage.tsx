import React, { useState } from 'react';
import StackSidebar from './StackSidebar';
import StackResources from './StackResources';

const LoginPage: React.FC = () => {
  const [selectedStack, setSelectedStack] = useState<string | null>(null);

  const handleStackSelect = (stackName: string) => {
    setSelectedStack(stackName);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Sidebar - Account & Stacks Navigation */}
      <StackSidebar 
        onStackSelect={handleStackSelect}
        selectedStack={selectedStack}
      />

      {/* Right Content - Stack Resources */}
      <div className="flex-1 bg-white">
        <StackResources stackName={selectedStack} />
      </div>
    </div>
  );
};

export default LoginPage; 