import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { UpdateCustomerDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs/Tabs';
import { ChevronLeftIcon, PlusIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function CustomerEditPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(key!);
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions(key);
  const updateCustomer = useUpdateCustomer();

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    externalBillingId: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        displayName: customer.displayName || '',
        email: customer.email || '',
        externalBillingId: customer.externalBillingId || '',
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      // Clean up optional fields - convert empty strings to undefined
      const dataToSubmit: UpdateCustomerDto = {
        displayName: formData.displayName || undefined,
        email: formData.email.trim() || undefined,
        externalBillingId: formData.externalBillingId || undefined,
      };
      
      await updateCustomer.mutateAsync({ key: key!, data: dataToSubmit });
      toast.success('Customer updated successfully');
      navigate('/customers');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to update customer');
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  if (!customer) {
    return <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">Customer not found</p>
    </div>;
  }

  return (
    <>
      <PageMeta title="Edit Customer - Subscrio Admin" description="Edit customer details" />
      
      <div className="space-y-6">
        <div>
          <Link
            to="/customers"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ChevronLeftIcon className="size-5" />
            Back to customers
          </Link>
          
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Edit Customer
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Key:
            </span>
            <code className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
              {customer.key}
            </code>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {customer.displayName || customer.key}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <Tabs defaultValue="details">
            <TabsList className="px-6 pt-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={updateCustomer.isPending}
                    placeholder="e.g., John Doe or Acme Corp"
                    error={!!fieldErrors.displayName}
                    hint={fieldErrors.displayName || 'Optional human-readable name'}
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={updateCustomer.isPending}
                    placeholder="customer@example.com"
                    error={!!fieldErrors.email}
                    hint={fieldErrors.email || 'Optional email address'}
                  />
                </div>

                <div>
                  <Label>External Billing ID</Label>
                  <Input
                    value={formData.externalBillingId}
                    onChange={(e) => setFormData({ ...formData, externalBillingId: e.target.value })}
                    disabled={updateCustomer.isPending}
                    placeholder="e.g., Stripe customer ID (cus_...)"
                    error={!!fieldErrors.externalBillingId}
                    hint={fieldErrors.externalBillingId || 'Optional billing provider customer ID'}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Button type="submit" disabled={updateCustomer.isPending}>
                    {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="subscriptions" className="p-6">
              <div className="flex justify-end mb-4">
                <Link to={`/subscriptions/create?customerKey=${customer.key}`}>
                  <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
                    Add Subscription
                  </Button>
                </Link>
              </div>

              {subscriptionsLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">Loading subscriptions...</div>
                </div>
              ) : !subscriptions || subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No subscriptions found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    This customer doesn't have any subscriptions yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((subscription) => (
                    <Link
                      key={subscription.key}
                      to={`/subscriptions/edit/${subscription.key}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {subscription.planKey}
                          </p>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.status === 'active' 
                              ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                              : subscription.status === 'trial'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                              : subscription.status === 'cancelled'
                              ? 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {subscription.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Key: <code className="text-xs">{subscription.key}</code>
                        </p>
                        {subscription.currentPeriodEnd && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <ChevronLeftIcon className="size-5 rotate-180 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

