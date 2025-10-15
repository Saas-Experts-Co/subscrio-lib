import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

// Helper function to format date for datetime-local input
const formatDateTimeLocal = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function SubscriptionEditPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscription(key!);
  const updateSubscription = useUpdateSubscription();

  const [formData, setFormData] = useState({
    activationDate: '',
    expirationDate: '',
    cancellationDate: '',
    trialEndDate: '',
    currentPeriodStart: '',
    currentPeriodEnd: '',
    autoRenew: true,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Update form data when subscription loads
  useEffect(() => {
    if (subscription) {
      setFormData({
        activationDate: formatDateTimeLocal(subscription.activationDate),
        expirationDate: formatDateTimeLocal(subscription.expirationDate),
        cancellationDate: formatDateTimeLocal(subscription.cancellationDate),
        trialEndDate: formatDateTimeLocal(subscription.trialEndDate),
        currentPeriodStart: formatDateTimeLocal(subscription.currentPeriodStart),
        currentPeriodEnd: formatDateTimeLocal(subscription.currentPeriodEnd),
        autoRenew: subscription.autoRenew,
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      await updateSubscription.mutateAsync({
        key: key!,
        data: {
          activationDate: formData.activationDate || undefined,
          expirationDate: formData.expirationDate || undefined,
          cancellationDate: formData.cancellationDate || undefined,
          trialEndDate: formData.trialEndDate || undefined,
          currentPeriodStart: formData.currentPeriodStart || undefined,
          currentPeriodEnd: formData.currentPeriodEnd || undefined,
          autoRenew: formData.autoRenew,
        },
      });
      toast.success('Subscription updated successfully');
      navigate('/subscriptions');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to update subscription');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Subscription not found</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Edit Subscription - Subscrio Admin" description="Edit subscription details" />
      
      <div className="space-y-6">
        <div>
          <Link
            to="/subscriptions"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ChevronLeftIcon className="size-5" />
            Back to subscriptions
          </Link>
          
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Edit Subscription: {subscription.key}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update subscription dates and settings
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            {/* Read-only fields */}
            <div>
              <Label>Subscription Key</Label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <code className="text-sm text-gray-700 dark:text-gray-300">{subscription.key}</code>
              </div>
            </div>

            <div>
              <Label>Customer</Label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">{subscription.customerKey}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{subscription.productKey}</span>
                </div>
              </div>
              <div>
                <Label>Plan</Label>
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{subscription.planKey}</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Status (Computed)</Label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  subscription.status === 'pending' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  subscription.status === 'active' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 
                  subscription.status === 'trial' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' :
                  subscription.status === 'cancelled' ? 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400' :
                  subscription.status === 'expired' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Status is calculated automatically from dates
              </p>
            </div>

            {/* Editable date fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activationDate">Activation Date</Label>
                <input
                  id="activationDate"
                  type="datetime-local"
                  aria-label="Activation Date"
                  value={formData.activationDate}
                  onChange={(e) => setFormData({ ...formData, activationDate: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When subscription starts
                </p>
              </div>

              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <input
                  id="expirationDate"
                  type="datetime-local"
                  aria-label="Expiration Date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When subscription ends
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentPeriodStart">Current Period Start</Label>
                <input
                  id="currentPeriodStart"
                  type="datetime-local"
                  aria-label="Current Period Start"
                  value={formData.currentPeriodStart}
                  onChange={(e) => setFormData({ ...formData, currentPeriodStart: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Start of current billing period
                </p>
              </div>

              <div>
                <Label htmlFor="currentPeriodEnd">Current Period End</Label>
                <input
                  id="currentPeriodEnd"
                  type="datetime-local"
                  aria-label="Current Period End"
                  value={formData.currentPeriodEnd}
                  onChange={(e) => setFormData({ ...formData, currentPeriodEnd: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  End of current billing period
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trialEndDate">Trial End Date</Label>
                <input
                  id="trialEndDate"
                  type="datetime-local"
                  aria-label="Trial End Date"
                  value={formData.trialEndDate}
                  onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When trial period ends (if applicable)
                </p>
              </div>

              <div>
                <Label htmlFor="cancellationDate">Cancellation Date</Label>
                <input
                  id="cancellationDate"
                  type="datetime-local"
                  aria-label="Cancellation Date"
                  value={formData.cancellationDate}
                  onChange={(e) => setFormData({ ...formData, cancellationDate: e.target.value })}
                  disabled={updateSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When subscription was cancelled
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoRenew}
                  onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                  disabled={updateSubscription.isPending}
                  className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-renew subscription
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6">
                Automatically renew at the end of the period
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Link to="/subscriptions">
                <Button type="button" variant="outline" disabled={updateSubscription.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={updateSubscription.isPending}>
                {updateSubscription.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

