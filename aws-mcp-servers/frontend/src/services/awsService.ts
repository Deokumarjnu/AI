const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

export interface CloudFormationStack {
  StackName: string;
  StackStatus: string;
  CreationTime: string;
  LastUpdatedTime?: string;
  TemplateDescription?: string;
  DriftInformation?: any;
}

export interface StacksResponse {
  success: boolean;
  stackCount: number;
  stacks: CloudFormationStack[];
  isDemo?: boolean;
}

export interface AWSIdentity {
  success: boolean;
  identity: {
    Account: string;
    Arn: string;
    UserId: string;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  mcpConnected: boolean;
  version: string;
}

export interface StackResource {
  LogicalResourceId: string;
  PhysicalResourceId: string;
  ResourceType: string;
  ResourceStatus: string;
  Timestamp?: string;
  ResourceStatusReason?: string;
  Description?: string;
}

export interface StackResourcesResponse {
  success: boolean;
  stackName: string;
  resourceCount: number;
  resources: StackResource[];
}

class AWSService {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<HealthResponse> {
    return this.fetchWithErrorHandling<HealthResponse>('/health');
  }

  async getAWSIdentity(): Promise<AWSIdentity> {
    return this.fetchWithErrorHandling<AWSIdentity>('/api/aws/identity');
  }

  async getCloudFormationStacks(options?: {
    status?: string | string[];
    region?: string;
  }): Promise<StacksResponse> {
    const queryParams = new URLSearchParams();
    
    if (options?.status) {
      if (Array.isArray(options.status)) {
        options.status.forEach(s => queryParams.append('status', s));
      } else {
        queryParams.append('status', options.status);
      }
    }
    
    if (options?.region) {
      queryParams.append('region', options.region);
    }

    const url = `/api/aws/stacks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.fetchWithErrorHandling<StacksResponse>(url);
  }

  async getStackDetails(stackName: string): Promise<any> {
    return this.fetchWithErrorHandling(`/api/aws/stacks/${encodeURIComponent(stackName)}`);
  }

  async getStackResources(stackName: string): Promise<StackResourcesResponse> {
    return this.fetchWithErrorHandling<StackResourcesResponse>(`/api/aws/stacks/${encodeURIComponent(stackName)}/resources`);
  }

  async getMCPTools(): Promise<any> {
    return this.fetchWithErrorHandling('/api/mcp/tools');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'CREATE_COMPLETE':
      case 'UPDATE_COMPLETE':
        return 'text-green-600';
      case 'CREATE_IN_PROGRESS':
      case 'UPDATE_IN_PROGRESS':
        return 'text-blue-600';
      case 'CREATE_FAILED':
      case 'UPDATE_FAILED':
      case 'DELETE_FAILED':
        return 'text-red-600';
      case 'DELETE_COMPLETE':
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  getResourceStatusColor(status: string): string {
    switch (status) {
      case 'CREATE_COMPLETE':
      case 'UPDATE_COMPLETE':
        return 'text-green-600';
      case 'CREATE_IN_PROGRESS':
      case 'UPDATE_IN_PROGRESS':
        return 'text-blue-600';
      case 'CREATE_FAILED':
      case 'UPDATE_FAILED':
      case 'DELETE_FAILED':
        return 'text-red-600';
      case 'DELETE_COMPLETE':
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  }

  getResourceTypeIcon(resourceType: string): string {
    if (resourceType.includes('::S3::')) return '🪣';
    if (resourceType.includes('::EC2::')) return '💻';
    if (resourceType.includes('::Lambda::')) return '⚡';
    if (resourceType.includes('::RDS::')) return '🗄️';
    if (resourceType.includes('::IAM::')) return '🔐';
    if (resourceType.includes('::CloudWatch::')) return '📊';
    if (resourceType.includes('::SNS::')) return '📢';
    if (resourceType.includes('::SQS::')) return '📬';
    if (resourceType.includes('::DynamoDB::')) return '🏪';
    if (resourceType.includes('::VPC::')) return '🌐';
    if (resourceType.includes('::ELB::') || resourceType.includes('::LoadBalancer')) return '⚖️';
    return '📦';
  }
}

export default new AWSService(); 