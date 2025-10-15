import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CreateSubscriptionDto, UpdateSubscriptionDto } from '@subscrio/core';
import { toast } from 'sonner';

export function useSubscriptions(customerKey?: string) {
  return useQuery({
    queryKey: customerKey ? ['subscriptions', 'customer', customerKey] : ['subscriptions'],
    queryFn: () => customerKey
      ? apiClient.subscriptions.getByCustomer(customerKey)
      : apiClient.subscriptions.list()
  });
}

export function useSubscription(key: string) {
  return useQuery({
    queryKey: ['subscriptions', key],
    queryFn: () => apiClient.subscriptions.get(key),
    enabled: !!key
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionDto) => apiClient.subscriptions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateSubscriptionDto }) =>
      apiClient.subscriptions.update(key, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.key] });
    }
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => apiClient.subscriptions.cancel(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel subscription', { description: error.message });
    }
  });
}
