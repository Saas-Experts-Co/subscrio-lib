import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { usePlan, useUpdatePlan } from '@/hooks/usePlans';
import { useFeatures } from '@/hooks/useFeatures';
import { usePlanFeatures, useSetPlanFeature, useRemovePlanFeature } from '@/hooks/usePlanFeatures';
import { useBillingCyclesByPlan, useDeleteBillingCycle } from '@/hooks/useBillingCycles';
import { UpdatePlanDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs/Tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BillingCycleModal } from '../../components/subscrio/BillingCycleModal';
import { ChevronLeftIcon, PlusIcon, TrashBinIcon, PencilIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function PlanEditPage() {
  const { productKey, planKey } = useParams<{ productKey: string; planKey: string }>();
  const navigate = useNavigate();
  
  const { data: plan, isLoading } = usePlan(productKey!, planKey!);
  const { data: allFeatures } = useFeatures();
  const { data: planFeatures } = usePlanFeatures(productKey!, planKey!);
  const { data: billingCycles } = useBillingCyclesByPlan(productKey!, planKey!);
  const updatePlan = useUpdatePlan();
  const setFeatureValue = useSetPlanFeature();
  const removeFeature = useRemovePlanFeature();
  const deleteBillingCycle = useDeleteBillingCycle();

  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [featureValues, setFeatureValues] = useState<Record<string, string>>({});
  const [addingFeatureKey, setAddingFeatureKey] = useState('');
  const [addingFeatureValue, setAddingFeatureValue] = useState('');
  const [featureToRemove, setFeatureToRemove] = useState<string | null>(null);
  
  // Billing cycle state
  const [billingCycleModal, setBillingCycleModal] = useState<{
    isOpen: boolean;
    cycle: any | null;
  }>({
    isOpen: false,
    cycle: null,
  });
  const [billingCycleToDelete, setBillingCycleToDelete] = useState<{
    key: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData({
        displayName: plan.displayName,
        description: plan.description || '',
      });
    }
  }, [plan]);

  useEffect(() => {
    if (planFeatures) {
      const values: Record<string, string> = {};
      planFeatures.forEach((pf) => {
        values[pf.featureKey] = pf.value;
      });
      setFeatureValues(values);
    }
  }, [planFeatures]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      await updatePlan.mutateAsync({ productKey: productKey!, planKey: planKey!, data: formData as UpdatePlanDto });
      toast.success('Plan updated successfully');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to update plan');
      }
    }
  };

  const handleAddFeature = async () => {
    if (!addingFeatureKey || !addingFeatureValue) {
      toast.error('Please select a feature and enter a value');
      return;
    }

    try {
      await setFeatureValue.mutateAsync({
        productKey: productKey!,
        planKey: planKey!,
        featureKey: addingFeatureKey,
        value: addingFeatureValue,
      });
      toast.success('Feature value set');
      setAddingFeatureKey('');
      setAddingFeatureValue('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set feature value');
    }
  };

  const handleRemoveFeature = async () => {
    if (!featureToRemove) return;

    try {
      await removeFeature.mutateAsync({ 
        productKey: productKey!, 
        planKey: planKey!, 
        featureKey: featureToRemove
      });
      toast.success('Feature removed');
      setFeatureToRemove(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove feature');
      setFeatureToRemove(null);
    }
  };

  const handleDeleteBillingCycle = async () => {
    if (!billingCycleToDelete) return;

    try {
      await deleteBillingCycle.mutateAsync({
        productKey: productKey!,
        planKey: planKey!,
        key: billingCycleToDelete.key
      });
      toast.success('Billing cycle deleted successfully');
      setBillingCycleToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete billing cycle');
      setBillingCycleToDelete(null);
    }
  };

  const formatDuration = (value: number, unit: string) => {
    if (value === 1) {
      return `1 ${unit.replace(/s$/, '')}`;
    }
    return `${value} ${unit}`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  if (!plan) {
    return <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">Plan not found</p>
    </div>;
  }

  const availableFeatures = allFeatures?.filter(
    (f) => !planFeatures?.some((pf) => pf.featureKey === f.key)
  );

  return (
    <>
      <PageMeta title="Edit Plan - Subscrio Admin" description="Edit subscription plan" />
      
      <div className="space-y-6">
        <div>
          <Link
            to="/plans"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ChevronLeftIcon className="size-5" />
            Back to plans
          </Link>
          
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Edit Plan
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Key:
            </span>
            <code className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
              {plan.key}
            </code>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {plan.displayName}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <Tabs defaultValue="properties">
            <TabsList className="px-6 pt-6">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="billing-cycles">Billing Cycles</TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>
                    Display Name <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={updatePlan.isPending}
                    error={!!fieldErrors.displayName}
                    hint={fieldErrors.displayName}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    disabled={updatePlan.isPending}
                    rows={3}
                    error={!!fieldErrors.description}
                    hint={fieldErrors.description}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Button type="submit" disabled={updatePlan.isPending}>
                    {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="features" className="p-6 space-y-6">
              {/* Current Features */}
              {planFeatures && planFeatures.length > 0 && (
                <div className="space-y-3">
                  {planFeatures.map((pf) => {
                    const feature = allFeatures?.find((f) => f.key === pf.featureKey);
                    return (
                      <div
                        key={pf.featureKey}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {feature?.displayName || pf.featureKey}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {pf.featureKey} • {feature?.valueType || 'unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <code className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                            {pf.value}
                          </code>
                          <button
                            onClick={() => setFeatureToRemove(pf.featureKey)}
                            aria-label="Remove feature"
                            className="p-2 text-error-500 hover:text-error-600 dark:text-error-400"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Feature */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Add Feature Value
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5">Feature</Label>
                    <select
                      value={addingFeatureKey}
                      onChange={(e) => {
                        setAddingFeatureKey(e.target.value);
                        const feature = allFeatures?.find((f) => f.key === e.target.value);
                        if (feature) {
                          setAddingFeatureValue(feature.defaultValue);
                        }
                      }}
                      aria-label="Select feature"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="">Select feature...</option>
                      {availableFeatures?.map((feature) => (
                        <option key={feature.key} value={feature.key}>
                          {feature.displayName} ({feature.valueType})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5">Value for this plan</Label>
                    <Input
                      value={addingFeatureValue}
                      onChange={(e) => setAddingFeatureValue(e.target.value)}
                      placeholder="Value"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 invisible">Action</Label>
                    <Button
                      type="button"
                      onClick={handleAddFeature}
                      size="sm"
                      disabled={!addingFeatureKey || !addingFeatureValue}
                      className="w-full"
                      startIcon={<PlusIcon className="size-5" />}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing-cycles" className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage billing frequencies for this plan's subscriptions
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setBillingCycleModal({ isOpen: true, cycle: null })}
                  startIcon={<PlusIcon className="size-5" />}
                >
                  Add Billing Cycle
                </Button>
              </div>

              {billingCycles && billingCycles.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Key</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">External ID</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingCycles.map((cycle) => (
                        <tr key={cycle.key} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                            {cycle.displayName}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                              {cycle.key}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400">
                              {formatDuration(cycle.durationValue, cycle.durationUnit)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cycle.externalProductId ? (
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                {cycle.externalProductId}
                              </code>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setBillingCycleModal({ isOpen: true, cycle })}
                                aria-label="Edit billing cycle"
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                              >
                                <PencilIcon className="size-4" />
                              </button>
                              <button
                                onClick={() => setBillingCycleToDelete({ key: cycle.key, name: cycle.displayName })}
                                aria-label="Delete billing cycle"
                                className="p-1.5 text-error-500 hover:text-error-600 dark:text-error-400 transition-colors"
                              >
                                <TrashBinIcon className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No billing cycles yet</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setBillingCycleModal({ isOpen: true, cycle: null })}
                  >
                    Create Your First Billing Cycle
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmDialog
        isOpen={featureToRemove !== null}
        onClose={() => setFeatureToRemove(null)}
        onConfirm={handleRemoveFeature}
        title="Remove Feature"
        message="Are you sure you want to remove this feature from the plan? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={billingCycleToDelete !== null}
        onClose={() => setBillingCycleToDelete(null)}
        onConfirm={handleDeleteBillingCycle}
        title="Delete Billing Cycle?"
        message={`Are you sure you want to permanently delete "${billingCycleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <BillingCycleModal
        isOpen={billingCycleModal.isOpen}
        onClose={() => setBillingCycleModal({ isOpen: false, cycle: null })}
        billingCycle={billingCycleModal.cycle}
        productKey={productKey!}
        planKey={planKey!}
      />
    </>
  );
}

