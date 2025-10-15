import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface BillingCycle {
  productKey: string;
  planKey: string;
  key: string;
  displayName: string;
  description?: string;
  durationValue: number;
  durationUnit: string;
  externalProductId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateBillingCycleDto {
  key: string;
  displayName: string;
  durationValue: number;
  durationUnit: 'days' | 'weeks' | 'months' | 'years';
  externalProductId?: string;
}

export function useBillingCyclesByPlan(productKey: string, planKey: string) {
  return useQuery<BillingCycle[]>({
    queryKey: ['billingCycles', productKey, planKey],
    queryFn: () => apiClient.billingCycles.getByPlan(productKey, planKey),
    enabled: !!productKey && !!planKey
  });
}

export function useBillingCycle(productKey: string, planKey: string, key: string) {
  return useQuery<BillingCycle>({
    queryKey: ['billingCycles', productKey, planKey, key],
    queryFn: () => apiClient.billingCycles.get(productKey, planKey, key),
    enabled: !!productKey && !!planKey && !!key
  });
}

export function useCreateBillingCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey, data }: { 
      productKey: string; 
      planKey: string; 
      data: CreateBillingCycleDto 
    }) => apiClient.billingCycles.create(productKey, planKey, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billingCycles', variables.productKey, variables.planKey] });
    }
  });
}

export function useUpdateBillingCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      productKey, 
      planKey, 
      key, 
      data 
    }: { 
      productKey: string; 
      planKey: string; 
      key: string; 
      data: Partial<CreateBillingCycleDto> 
    }) => apiClient.billingCycles.update(productKey, planKey, key, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billingCycles', variables.productKey, variables.planKey] });
      queryClient.invalidateQueries({ queryKey: ['billingCycles', variables.productKey, variables.planKey, variables.key] });
    }
  });
}

export function useDeleteBillingCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey, key }: { productKey: string; planKey: string; key: string }) => 
      apiClient.billingCycles.delete(productKey, planKey, key),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billingCycles', variables.productKey, variables.planKey] });
    }
  });
}

