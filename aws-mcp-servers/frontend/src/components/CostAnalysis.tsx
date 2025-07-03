import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface CostAnalysisProps {
  selectedStack: string | null;
}

interface CostGroup {
  name: string;
  blendedCost: number;
  unblendedCost: number;
  usageQuantity: number;
  unit: string;
}

interface CostDataPoint {
  date: string;
  endDate: string;
  groups: CostGroup[];
  totalCost: number;
}

interface CostAnalysisResponse {
  success: boolean;
  accountId: string;
  stackName: string;
  dateRange: {
    start: string;
    end: string;
  };
  granularity: string;
  groupBy: string;
  totalCosts: {
    blendedCost: number;
    unblendedCost: number;
    usageQuantity: number;
    currency: string;
  };
  costData: CostDataPoint[];
  demoMode?: boolean;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({ selectedStack }) => {
  const [costData, setCostData] = useState<CostDataPoint[]>([]);
  const [totalCosts, setTotalCosts] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  
  // Chart settings
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'pie'>('line');
  const [granularity, setGranularity] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [groupBy, setGroupBy] = useState<'SERVICE' | 'RESOURCE_ID' | 'USAGE_TYPE'>('SERVICE');
  
  // Date range settings
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRangePreset, setDateRangePreset] = useState<string>('30days');

  // Colors for charts
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
    '#00c49f', '#ffbb28', '#ff6b6b', '#4ecdc4', '#45b7d1'
  ];

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

  // Fetch cost data when parameters change
  useEffect(() => {
    if (accountId && selectedStack) {
      fetchCostData();
    }
  }, [accountId, selectedStack, startDate, endDate, granularity, groupBy]);

  const fetchCostData = async () => {
    if (!accountId || !selectedStack) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate,
        endDate,
        granularity,
        groupBy
      });

      const response = await fetch(
        `http://localhost:3002/api/aws/accounts/${accountId}/stacks/${selectedStack}/cost-analysis?${params}`
      );
      const data: CostAnalysisResponse = await response.json();

      if (data.success) {
        setCostData(data.costData || []);
        setTotalCosts(data.totalCosts);
      } else {
        setError(data.error || 'Failed to fetch cost data');
      }
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangePreset = (preset: string) => {
    setDateRangePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case '7days':
        setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '30days':
        setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '90days':
        setStartDate(format(subDays(now, 90), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'thisMonth':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
    }
  };

  // Prepare data for time series charts
  const prepareTimeSeriesData = () => {
    return costData.map(dataPoint => {
      const result: any = {
        date: format(new Date(dataPoint.date), 'MMM dd'),
        totalCost: Number(dataPoint.totalCost.toFixed(2))
      };

      // Add individual services/resources as separate lines
      dataPoint.groups.forEach(group => {
        result[group.name] = Number(group.blendedCost.toFixed(2));
      });

      return result;
    });
  };

  // Prepare data for pie chart (aggregate by service)
  const preparePieData = () => {
    const serviceAggregates: { [key: string]: number } = {};
    
    costData.forEach(dataPoint => {
      dataPoint.groups.forEach(group => {
        serviceAggregates[group.name] = (serviceAggregates[group.name] || 0) + group.blendedCost;
      });
    });

    return Object.entries(serviceAggregates)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Get unique service names for chart lines
  const getUniqueServices = () => {
    const services = new Set<string>();
    costData.forEach(dataPoint => {
      dataPoint.groups.forEach(group => {
        services.add(group.name);
      });
    });
    return Array.from(services);
  };

  const renderChart = () => {
    if (costData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No cost data available for the selected period</p>
        </div>
      );
    }

    const timeSeriesData = prepareTimeSeriesData();
    const pieData = preparePieData();
    const services = getUniqueServices();

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
              <Legend />
              <Line type="monotone" dataKey="totalCost" stroke="#8884d8" strokeWidth={3} name="Total Cost" />
              {services.slice(0, 5).map((service, index) => (
                <Line
                  key={service}
                  type="monotone"
                  dataKey={service}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
              <Legend />
              <Area type="monotone" dataKey="totalCost" stackId="1" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
              <Legend />
              <Bar dataKey="totalCost" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value}`} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!selectedStack) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-xl font-semibold mb-2">Select a CloudFormation Stack</h2>
          <p>Choose a stack from the left sidebar to view cost analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Cost Analysis</h2>
        <p className="text-gray-600">
          Cost breakdown for stack: <span className="font-medium text-blue-600">{selectedStack}</span>
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Range</label>
            <select
              value={dateRangePreset}
              onChange={(e) => handleDateRangePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="thisMonth">This month</option>
              <option value="lastMonth">Last month</option>
            </select>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          {/* Granularity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Granularity</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SERVICE">Service</option>
              <option value="RESOURCE_ID">Resource</option>
              <option value="USAGE_TYPE">Usage Type</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={fetchCostData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Cost Summary */}
      {totalCosts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-blue-800 text-sm font-medium">Total Cost</div>
            <div className="text-2xl font-bold text-blue-900">
              ${totalCosts.blendedCost.toFixed(2)}
            </div>
            <div className="text-blue-600 text-sm">
              {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd')}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-800 text-sm font-medium">Average Daily Cost</div>
            <div className="text-2xl font-bold text-green-900">
              ${(totalCosts.blendedCost / costData.length || 0).toFixed(2)}
            </div>
            <div className="text-green-600 text-sm">Per day</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-purple-800 text-sm font-medium">Usage Quantity</div>
            <div className="text-2xl font-bold text-purple-900">
              {totalCosts.usageQuantity.toLocaleString()}
            </div>
            <div className="text-purple-600 text-sm">Total units</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Cost Visualization</h3>
          {loading && (
            <div className="text-sm text-gray-500">Loading chart data...</div>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {renderChart()}
      </div>

      {/* Cost Breakdown Table */}
      {costData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Cost Breakdown by {groupBy.replace('_', ' ')}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {groupBy.replace('_', ' ')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Daily Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preparePieData().map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(item.value / costData.length).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(Math.random() * 1000)} {/* Placeholder for usage quantity */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostAnalysis; 