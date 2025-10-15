import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

export function usePlanFeatures(productKey: string, planKey: string) {
  return useQuery({
    queryKey: ['plans', productKey, planKey, 'features'],
    queryFn: () => apiClient.plans.getFeatures(productKey, planKey),
    enabled: !!productKey && !!planKey
  });
}

export function useSetPlanFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey, featureKey, value }: { productKey: string; planKey: string; featureKey: string; value: string }) =>
      apiClient.plans.setFeatureValue(productKey, planKey, featureKey, value),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans', variables.productKey, variables.planKey, 'features'] });
      queryClient.invalidateQueries({ queryKey: ['plans', variables.productKey, variables.planKey] });
      toast.success('Feature updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update feature', { description: error.message });
    }
  });
}

export function useRemovePlanFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productKey, planKey, featureKey }: { productKey: string; planKey: string; featureKey: string }) =>
      apiClient.plans.removeFeature(productKey, planKey, featureKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans', variables.productKey, variables.planKey, 'features'] });
      queryClient.invalidateQueries({ queryKey: ['plans', variables.productKey, variables.planKey] });
      toast.success('Feature removed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove feature', { description: error.message });
    }
  });
}

