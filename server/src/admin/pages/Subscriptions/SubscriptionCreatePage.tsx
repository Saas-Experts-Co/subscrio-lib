import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useCreateSubscription } from '@/hooks/useSubscriptions';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { usePlans } from '@/hooks/usePlans';
import { useBillingCyclesByPlan } from '@/hooks/useBillingCycles';
import { CreateSubscriptionDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function SubscriptionCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCustomerKey = searchParams.get('customerKey');
  const createSubscription = useCreateSubscription();
  
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const { data: products, isLoading: loadingProducts } = useProducts();
  
  const [selectedProductKey, setSelectedProductKey] = useState('');
  const [selectedPlanKey, setSelectedPlanKey] = useState('');
  const { data: plans, isLoading: loadingPlans } = usePlans(selectedProductKey);
  const { data: billingCycles, isLoading: loadingBillingCycles } = useBillingCyclesByPlan(
    selectedProductKey, 
    selectedPlanKey
  );

  const [formData, setFormData] = useState({
    key: '',
    customerKey: '',
    productKey: '',
    planKey: '',
    billingCycleKey: '',
    activationDate: '',
    expirationDate: '',
    trialEndDate: '',
    currentPeriodStart: '',
    currentPeriodEnd: '',
    autoRenew: true,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Prefill customer if provided in URL
  useEffect(() => {
    if (prefilledCustomerKey) {
      setFormData(prev => ({ ...prev, customerKey: prefilledCustomerKey }));
    }
  }, [prefilledCustomerKey]);

  const handleProductChange = (productKey: string) => {
    setSelectedProductKey(productKey);
    setSelectedPlanKey(''); // Reset selected plan
    setFormData({ 
      ...formData, 
      productKey,
      planKey: '', // Reset plan when product changes
      billingCycleKey: '', // Reset billing cycle when product changes
    });
  };

  const handlePlanChange = (planKey: string) => {
    setSelectedPlanKey(planKey);
    setFormData({ 
      ...formData, 
      planKey,
      billingCycleKey: '', // Reset billing cycle when plan changes
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      await createSubscription.mutateAsync(formData as CreateSubscriptionDto);
      toast.success('Subscription created successfully');
      navigate('/subscriptions');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to create subscription');
      }
    }
  };

  return (
    <>
      <PageMeta title="Create Subscription - Subscrio Admin" description="Create a new subscription" />
      
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
            Create Subscription
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new customer subscription
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <Label>
                Subscription Key <span className="text-error-500">*</span>
              </Label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., sub-123"
                disabled={createSubscription.isPending}
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                  fieldErrors.key
                    ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                    : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                }`}
              />
              {fieldErrors.key ? (
                <p className="mt-1.5 text-xs text-error-500">{fieldErrors.key}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Unique identifier for this subscription
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="customer">
                Customer <span className="text-error-500">*</span>
              </Label>
              {loadingCustomers ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading customers...</div>
              ) : (
                <>
                  <select
                    id="customer"
                    aria-label="Customer"
                    value={formData.customerKey}
                    onChange={(e) => setFormData({ ...formData, customerKey: e.target.value })}
                    disabled={createSubscription.isPending || !!prefilledCustomerKey}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                      fieldErrors.customerKey
                        ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                    }`}
                  >
                    <option value="">Select a customer</option>
                    {customers?.map((customer) => (
                      <option key={customer.key} value={customer.key}>
                        {customer.displayName || customer.key} ({customer.key})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.customerKey && (
                    <p className="mt-1.5 text-xs text-error-500">{fieldErrors.customerKey}</p>
                  )}
                </>
              )}
              {!fieldErrors.customerKey && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {prefilledCustomerKey 
                    ? 'Customer is preset from the previous page'
                    : 'The customer who will own this subscription'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="product">
                Product <span className="text-error-500">*</span>
              </Label>
              {loadingProducts ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading products...</div>
              ) : (
                <>
                  <select
                    id="product"
                    aria-label="Product"
                    value={formData.productKey}
                    onChange={(e) => handleProductChange(e.target.value)}
                    disabled={createSubscription.isPending}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                      fieldErrors.productKey
                        ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                    }`}
                  >
                    <option value="">Select a product</option>
                    {products?.map((product) => (
                      <option key={product.key} value={product.key}>
                        {product.displayName} ({product.key})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.productKey && (
                    <p className="mt-1.5 text-xs text-error-500">{fieldErrors.productKey}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label htmlFor="plan">
                Plan <span className="text-error-500">*</span>
              </Label>
              {!formData.productKey ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Select a product first</div>
              ) : loadingPlans ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading plans...</div>
              ) : (
                <>
                  <select
                    id="plan"
                    aria-label="Plan"
                    value={formData.planKey}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    disabled={createSubscription.isPending || !plans || plans.length === 0}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                      fieldErrors.planKey
                        ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                    }`}
                  >
                    <option value="">Select a plan</option>
                    {plans?.map((plan) => (
                      <option key={plan.key} value={plan.key}>
                        {plan.displayName} ({plan.key})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.planKey && (
                    <p className="mt-1.5 text-xs text-error-500">{fieldErrors.planKey}</p>
                  )}
                </>
              )}
              {formData.productKey && plans?.length === 0 && (
                <p className="mt-1 text-xs text-error-500">
                  No plans available for this product. Create a plan first.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="billingCycleKey">
                Billing Cycle <span className="text-error-500">*</span>
              </Label>
              {!formData.planKey ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Select a plan first</div>
              ) : loadingBillingCycles ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading billing cycles...</div>
              ) : (
                <>
                  <select
                    id="billingCycleKey"
                    aria-label="Billing Cycle"
                    value={formData.billingCycleKey}
                    onChange={(e) => setFormData({ ...formData, billingCycleKey: e.target.value })}
                    disabled={createSubscription.isPending || !billingCycles || billingCycles.length === 0}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                      fieldErrors.billingCycleKey
                        ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                    }`}
                  >
                    <option value="">Select a billing cycle</option>
                    {billingCycles?.map((cycle) => (
                      <option key={cycle.key} value={cycle.key}>
                        {cycle.displayName} ({cycle.durationValue} {cycle.durationUnit})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.billingCycleKey && (
                    <p className="mt-1.5 text-xs text-error-500">{fieldErrors.billingCycleKey}</p>
                  )}
                </>
              )}
              {formData.planKey && billingCycles?.length === 0 && !fieldErrors.billingCycleKey && (
                <p className="mt-1 text-xs text-error-500">
                  No billing cycles for this plan. Edit the plan to add billing cycles.
                </p>
              )}
              {!fieldErrors.billingCycleKey && !(formData.planKey && billingCycles?.length === 0) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The billing frequency for this subscription
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activationDate">Activation Date</Label>
                <input
                  id="activationDate"
                  type="datetime-local"
                  aria-label="Activation Date"
                  value={formData.activationDate}
                  onChange={(e) => setFormData({ ...formData, activationDate: e.target.value })}
                  disabled={createSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When subscription starts (defaults to now)
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
                  disabled={createSubscription.isPending}
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
                  disabled={createSubscription.isPending}
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
                  disabled={createSubscription.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  End of current billing period
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="trialEndDate">Trial End Date</Label>
              <input
                id="trialEndDate"
                type="datetime-local"
                aria-label="Trial End Date"
                value={formData.trialEndDate}
                onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })}
                disabled={createSubscription.isPending}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                When trial period ends (if applicable)
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoRenew}
                  onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                  disabled={createSubscription.isPending}
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
                <Button type="button" variant="outline" disabled={createSubscription.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createSubscription.isPending}>
                {createSubscription.isPending ? 'Creating...' : 'Create Subscription'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

