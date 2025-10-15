import type {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  FeatureDto,
  CreateFeatureDto,
  UpdateFeatureDto,
  PlanDto,
  CreatePlanDto,
  UpdatePlanDto,
  CustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  SubscriptionDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  BillingCycleDto,
  CreateBillingCycleDto,
  UpdateBillingCycleDto
} from '@subscrio/core';
import { toast } from 'sonner';

// Always use relative URL - admin and API served from same server
const API_BASE = '/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('subscrio_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('subscrio_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('subscrio_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    // Add JWT token if available
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });

      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        this.clearToken();
        toast.error('Session expired', {
          description: 'Please log in again to continue.'
        });
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // If this is a validation error with field-level errors, throw without toast
        // The form component will handle displaying field-level errors
        if (errorData.name === 'ValidationError' && errorData.errors) {
          const error: any = new Error(errorData.error || 'Validation failed');
          error.name = 'ValidationError';
          error.errors = errorData.errors;
          throw error;
        }
        
        // For all other errors, show a user-friendly toast notification
        const errorMessage = errorData.error || errorData.message || 'Request failed';
        
        // Map HTTP status codes to friendly messages
        let toastMessage = errorMessage;
        let toastDescription: string | undefined;
        
        switch (response.status) {
          case 404:
            toastMessage = 'Not Found';
            toastDescription = errorMessage;
            break;
          case 409:
            toastMessage = 'Conflict';
            toastDescription = errorMessage;
            break;
          case 403:
            toastMessage = 'Access Denied';
            toastDescription = 'You do not have permission to perform this action.';
            break;
          case 500:
            toastMessage = 'Server Error';
            toastDescription = 'An unexpected error occurred. Please try again.';
            break;
          default:
            if (response.status >= 400 && response.status < 500) {
              toastMessage = 'Request Error';
              toastDescription = errorMessage;
            } else {
              toastDescription = errorMessage;
            }
        }
        
        toast.error(toastMessage, toastDescription ? { description: toastDescription } : undefined);
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network Error', {
          description: 'Unable to connect to the server. Please check your connection.'
        });
        throw new Error('Network error. Please check your connection.');
      }
      
      // Re-throw errors we've already handled
      throw error;
    }
  }

  // Auth
  auth = {
    login: async (passphrase: string) => {
      const result = await this.request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ passphrase })
      });
      
      this.setToken(result.token);
      return result;
    },
    
    logout: () => {
      this.clearToken();
    },
    
    isAuthenticated: () => {
      return this.isAuthenticated();
    }
  };

  // Products
  products = {
    list: () => this.request<ProductDto[]>('/products'),
    get: (key: string) => this.request<ProductDto>(`/products/${key}`),
    create: (data: CreateProductDto) =>
      this.request<ProductDto>('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (key: string, data: UpdateProductDto) =>
      this.request<ProductDto>(`/products/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    archive: (key: string) =>
      this.request<void>(`/products/${key}/archive`, { method: 'POST' }),
    activate: (key: string) =>
      this.request<ProductDto>(`/products/${key}/activate`, { method: 'POST' }),
    delete: (key: string) =>
      this.request<void>(`/products/${key}`, { method: 'DELETE' })
  };

  // Features
  features = {
    list: () => this.request<FeatureDto[]>('/features'),
    get: (key: string) => this.request<FeatureDto>(`/features/${key}`),
    getByProduct: (productKey: string) =>
      this.request<FeatureDto[]>(`/products/${productKey}/features`),
    create: (data: CreateFeatureDto) =>
      this.request<FeatureDto>('/features', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (key: string, data: UpdateFeatureDto) =>
      this.request<FeatureDto>(`/features/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (key: string) =>
      this.request<void>(`/features/${key}`, { method: 'DELETE' })
  };

  // Plans
  plans = {
    list: () => this.request<PlanDto[]>('/plans'),
    get: (productKey: string, planKey: string) => 
      this.request<PlanDto>(`/products/${productKey}/plans/${planKey}`),
    getByProduct: (productKey: string) =>
      this.request<PlanDto[]>(`/products/${productKey}/plans`),
    create: (data: CreatePlanDto) =>
      this.request<PlanDto>('/plans', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (productKey: string, planKey: string, data: UpdatePlanDto) =>
      this.request<PlanDto>(`/products/${productKey}/plans/${planKey}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    archive: (productKey: string, planKey: string) =>
      this.request<void>(`/products/${productKey}/plans/${planKey}/archive`, { method: 'POST' }),
    delete: (productKey: string, planKey: string) =>
      this.request<void>(`/products/${productKey}/plans/${planKey}`, { method: 'DELETE' }),
    
    // Plan Feature Management
    getFeatures: (productKey: string, planKey: string) =>
      this.request<Array<{ featureKey: string; value: string }>>(`/products/${productKey}/plans/${planKey}/features`),
    setFeatureValue: (productKey: string, planKey: string, featureKey: string, value: string) =>
      this.request<{ success: boolean }>(`/products/${productKey}/plans/${planKey}/features/${featureKey}`, {
        method: 'POST',
        body: JSON.stringify({ value })
      }),
    removeFeature: (productKey: string, planKey: string, featureKey: string) =>
      this.request<{ success: boolean }>(`/products/${productKey}/plans/${planKey}/features/${featureKey}`, {
        method: 'DELETE'
      }),
    getFeatureValue: (productKey: string, planKey: string, featureKey: string) =>
      this.request<{ value: string | null }>(`/products/${productKey}/plans/${planKey}/features/${featureKey}`)
  };

  // Customers
  customers = {
    list: () => this.request<CustomerDto[]>('/customers'),
    get: (key: string) => this.request<CustomerDto>(`/customers/${key}`),
    create: (data: CreateCustomerDto) =>
      this.request<CustomerDto>('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (key: string, data: UpdateCustomerDto) =>
      this.request<CustomerDto>(`/customers/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (key: string) =>
      this.request<void>(`/customers/${key}`, { method: 'DELETE' })
  };

  // Subscriptions
  subscriptions = {
    list: () => this.request<SubscriptionDto[]>('/subscriptions'),
    get: (key: string) => this.request<SubscriptionDto>(`/subscriptions/${key}`),
    getByCustomer: (customerKey: string) =>
      this.request<SubscriptionDto[]>(`/customers/${customerKey}/subscriptions`),
    create: (data: CreateSubscriptionDto) =>
      this.request<SubscriptionDto>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (key: string, data: UpdateSubscriptionDto) =>
      this.request<SubscriptionDto>(`/subscriptions/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    cancel: (key: string) =>
      this.request<void>(`/subscriptions/${key}/cancel`, { method: 'POST' })
  };

  // Billing Cycles
  billingCycles = {
    getByPlan: (productKey: string, planKey: string) =>
      this.request<BillingCycleDto[]>(`/products/${productKey}/plans/${planKey}/billing-cycles`),
    get: (productKey: string, planKey: string, key: string) => 
      this.request<BillingCycleDto>(`/products/${productKey}/plans/${planKey}/billing-cycles/${key}`),
    create: (productKey: string, planKey: string, data: Omit<CreateBillingCycleDto, 'productKey' | 'planKey'>) =>
      this.request<BillingCycleDto>(`/products/${productKey}/plans/${planKey}/billing-cycles`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (productKey: string, planKey: string, key: string, data: UpdateBillingCycleDto) =>
      this.request<BillingCycleDto>(`/products/${productKey}/plans/${planKey}/billing-cycles/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (productKey: string, planKey: string, key: string) =>
      this.request<void>(`/products/${productKey}/plans/${planKey}/billing-cycles/${key}`, { method: 'DELETE' })
  };

  // Feature Checker
  featureChecker = {
    getValue: (customerKey: string, featureKey: string) =>
      this.request<{ value: any; isEnabled: boolean }>(
        `/customers/${customerKey}/features/${featureKey}/value`
      ),
    getAll: (customerKey: string) =>
      this.request<{ allFeatures: Record<string, string>; summary: any }>(
        `/customers/${customerKey}/features`
      )
  };
}

export const apiClient = new APIClient();

