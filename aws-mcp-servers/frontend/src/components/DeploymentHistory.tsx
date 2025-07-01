import React, { useState, useEffect } from 'react';

interface DeploymentRecord {
  id: string;
  version: string;
  deployTag: string;
  timestamp: string;
  status: 'success' | 'failed' | 'in-progress';
}

const DeploymentHistory: React.FC = () => {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock deployment data that matches the screenshot
  const mockDeployments: DeploymentRecord[] = [
    {
      id: '597036',
      version: 'master',
      deployTag: '20190927054',
      timestamp: '2019-09-27 05:54',
      status: 'success'
    },
    {
      id: '597034',
      version: 'redeploy',
      deployTag: '20190723050',
      timestamp: '2019-07-23 05:50',
      status: 'success'
    },
    {
      id: '597033',
      version: 'master',
      deployTag: '20190927040',
      timestamp: '2019-09-27 04:40',
      status: 'success'
    },
    {
      id: '597017',
      version: 'visual-story',
      deployTag: '20190926318',
      timestamp: '2019-09-26 31:18',
      status: 'success'
    },
    {
      id: '597008',
      version: 'master',
      deployTag: '20190926059',
      timestamp: '2019-09-26 09:59',
      status: 'success'
    }
  ];

  useEffect(() => {
    // Load initial data
    setDeployments(mockDeployments);
  }, []);

  const loadMore = () => {
    setLoading(true);
    // Simulate loading more data
    setTimeout(() => {
      const moreDeployments: DeploymentRecord[] = [
        {
          id: '597007',
          version: 'feature-branch',
          deployTag: '20190925123',
          timestamp: '2019-09-25 12:30',
          status: 'failed'
        },
        {
          id: '597006',
          version: 'master',
          deployTag: '20190925098',
          timestamp: '2019-09-25 09:45',
          status: 'success'
        }
      ];
      setDeployments(prev => [...prev, ...moreDeployments]);
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in-progress': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">History</h2>
      
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Id
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deploy Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deployments.map((deployment) => (
              <tr key={deployment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    {deployment.id}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {deployment.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -{deployment.deployTag}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(deployment.status)}`}>
                    {deployment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={loadMore}
          disabled={loading}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    </div>
  );
};

export default DeploymentHistory; 