import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CreatePlanDto, UpdatePlanDto } from '@subscrio/core';
import { toast } from 'sonner';

export function usePlans(productKey?: string) {
  return useQuery({
    queryKey: productKey ? ['plans', 'product', productKey] : ['plans'],
    queryFn: () => productKey
      ? apiClient.plans.getByProduct(productKey)
      : apiClient.plans.list()
  });
}

export function usePlan(productKey: string, planKey: string) {
  return useQuery({
    queryKey: ['plans', productKey, planKey],
    queryFn: () => apiClient.plans.get(productKey, planKey),
    enabled: !!productKey && !!planKey
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanDto) => apiClient.plans.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    }
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey, data }: { productKey: string; planKey: string; data: UpdatePlanDto }) =>
      apiClient.plans.update(productKey, planKey, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', variables.productKey, variables.planKey] });
    }
  });
}

export function useArchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey }: { productKey: string; planKey: string }) =>
      apiClient.plans.archive(productKey, planKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: any) => {
      toast.error('Failed to archive plan', { description: error.message });
    }
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey }: { productKey: string; planKey: string }) => 
      apiClient.plans.delete(productKey, planKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete plan', { description: error.message });
    }
  });
}
