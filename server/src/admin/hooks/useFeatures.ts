import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CreateFeatureDto, UpdateFeatureDto } from '@subscrio/core';
import { toast } from 'sonner';

export function useFeatures(productKey?: string) {
  return useQuery({
    queryKey: productKey ? ['features', 'product', productKey] : ['features'],
    queryFn: () => productKey 
      ? apiClient.features.getByProduct(productKey)
      : apiClient.features.list()
  });
}

export function useFeature(key: string) {
  return useQuery({
    queryKey: ['features', key],
    queryFn: () => apiClient.features.get(key),
    enabled: !!key
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeatureDto) => apiClient.features.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    }
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateFeatureDto }) =>
      apiClient.features.update(key, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features', variables.key] });
    }
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => apiClient.features.delete(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete feature', { description: error.message });
    }
  });
}
