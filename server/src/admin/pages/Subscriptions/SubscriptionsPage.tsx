import { Link } from 'react-router';
import { useState } from 'react';
import { useSubscriptions, useCancelSubscription } from '@/hooks/useSubscriptions';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PlusIcon, TrashBinIcon } from '../../icons';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const cancelSubscription = useCancelSubscription();
  
  const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const handleCancel = async () => {
    try {
      await cancelSubscription.mutateAsync(cancelConfirm.id);
      toast.success('Subscription canceled successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  return (
    <>
      <PageMeta title="Subscriptions - Subscrio Admin" description="Manage subscriptions" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Subscriptions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer subscriptions</p>
          </div>
          <Link to="/subscriptions/create">
            <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
              Create Subscription
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Key</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Product / Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Period</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions?.map((subscription) => (
                  <tr key={subscription.key} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/subscriptions/edit/${subscription.key}`}
                        className="inline-block text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300 hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                      >
                        {subscription.key}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-white/90">
                      {subscription.customerKey}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-white/90">
                      {subscription.productKey} / {subscription.planKey}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === 'pending' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        subscription.status === 'active' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 
                        subscription.status === 'trial' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' :
                        subscription.status === 'cancelled' ? 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400' :
                        subscription.status === 'expired' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {subscription.currentPeriodStart && subscription.currentPeriodEnd
                        ? `${new Date(subscription.currentPeriodStart).toLocaleDateString()} - ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {subscription.status === 'active' && (
                          <Tooltip content="Cancel subscription">
                            <button
                              aria-label="Cancel subscription"
                              onClick={() => setCancelConfirm({ isOpen: true, id: subscription.key, name: `${subscription.customerKey} - ${subscription.planKey}` })}
                              className="p-2 text-error-500 hover:text-error-600 dark:text-error-400 transition-colors"
                            >
                              <TrashBinIcon className="size-4" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={cancelConfirm.isOpen}
        onClose={() => setCancelConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleCancel}
        title="Cancel Subscription?"
        message={`Are you sure you want to cancel subscription "${cancelConfirm.name}"? The subscription will remain active until the end of the current billing period.`}
        confirmText="Cancel Subscription"
        variant="warning"
      />
    </>
  );
}

