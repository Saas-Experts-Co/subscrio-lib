import { useState, useEffect } from 'react';
import { useCreateBillingCycle, useUpdateBillingCycle } from '@/hooks/useBillingCycles';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

interface BillingCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  productKey: string;
  planKey: string;
  billingCycle?: {
    key: string;
    displayName: string;
    durationValue: number;
    durationUnit: string;
    externalProductId?: string;
  } | null;
}

export function BillingCycleModal({ isOpen, onClose, productKey, planKey, billingCycle }: BillingCycleModalProps) {
  const createBillingCycle = useCreateBillingCycle();
  const updateBillingCycle = useUpdateBillingCycle();
  const isEditing = !!billingCycle;

  const [formData, setFormData] = useState({
    key: '',
    displayName: '',
    durationValue: 1,
    durationUnit: 'months' as 'days' | 'weeks' | 'months' | 'years',
    externalProductId: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  useEffect(() => {
    if (billingCycle) {
      setFormData({
        key: billingCycle.key,
        displayName: billingCycle.displayName,
        durationValue: billingCycle.durationValue,
        durationUnit: billingCycle.durationUnit as any,
        externalProductId: billingCycle.externalProductId || '',
      });
      setKeyManuallyEdited(true);
    } else {
      setFormData({
        key: '',
        displayName: '',
        durationValue: 1,
        durationUnit: 'months',
        externalProductId: '',
      });
      setKeyManuallyEdited(false);
    }
  }, [billingCycle, isOpen]);

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[-_]+/g, '-')
      .trim();
  };

  const handleDisplayNameChange = (value: string) => {
    if (!keyManuallyEdited && !isEditing) {
      setFormData({ ...formData, displayName: value, key: generateKey(value) });
    } else {
      setFormData({ ...formData, displayName: value });
    }
  };

  const handleKeyChange = (value: string) => {
    setFormData({ ...formData, key: value });
    setKeyManuallyEdited(true);
  };

  const formatDuration = (value: number, unit: string) => {
    if (value === 1) {
      return `1 ${unit.replace(/s$/, '')}`;
    }
    return `${value} ${unit}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      const submitData = {
        key: formData.key,
        displayName: formData.displayName,
        durationValue: formData.durationValue,
        durationUnit: formData.durationUnit,
        externalProductId: formData.externalProductId || undefined,
      };
      
      if (isEditing) {
        await updateBillingCycle.mutateAsync({ 
          productKey,
          planKey,
          key: billingCycle.key, 
          data: {
            displayName: formData.displayName,
            durationValue: formData.durationValue,
            durationUnit: formData.durationUnit,
            externalProductId: formData.externalProductId || undefined,
          }
        });
        toast.success('Billing cycle updated successfully');
      } else {
        await createBillingCycle.mutateAsync({
          productKey,
          planKey,
          data: submitData
        });
        toast.success('Billing cycle created successfully');
      }
      
      onClose();
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} billing cycle`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-xl">
          <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditing ? 'Edit Billing Cycle' : 'Add Billing Cycle'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label>
                Display Name <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g., Monthly Billing"
                disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName}
              />
            </div>

            {isEditing ? (
              <div>
                <Label>Billing Cycle Key</Label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <code className="text-sm text-gray-700 dark:text-gray-300">{billingCycle.key}</code>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Keys cannot be changed after creation
                </p>
              </div>
            ) : (
              <div>
                <Label>
                  Billing Cycle Key <span className="text-error-500">*</span>
                </Label>
                <Input
                  value={formData.key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="e.g., monthly"
                  disabled={createBillingCycle.isPending}
                  error={!!fieldErrors.key}
                  hint={fieldErrors.key || 'Auto-generated from display name. Lowercase alphanumeric with hyphens only.'}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="durationValue">
                  Duration Value <span className="text-error-500">*</span>
                </Label>
                <input
                  id="durationValue"
                  type="number"
                  min="1"
                  value={formData.durationValue}
                  onChange={(e) => setFormData({ ...formData, durationValue: parseInt(e.target.value) || 1 })}
                  disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
                  className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                    fieldErrors.durationValue
                      ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                      : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                  }`}
                />
                {fieldErrors.durationValue && (
                  <p className="mt-1.5 text-xs text-error-500">{fieldErrors.durationValue}</p>
                )}
              </div>

              <div>
                <Label htmlFor="durationUnit">
                  Duration Unit <span className="text-error-500">*</span>
                </Label>
                <select
                  id="durationUnit"
                  aria-label="Duration Unit"
                  value={formData.durationUnit}
                  onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value as any })}
                  disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-blue-light-50 dark:bg-blue-light-500/10 rounded-lg">
              <p className="text-xs text-blue-light-700 dark:text-blue-light-400">
                <strong>Preview:</strong> Subscriptions will renew every{' '}
                <strong>{formatDuration(formData.durationValue, formData.durationUnit)}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="externalProductId">External Product ID</Label>
              <Input
                id="externalProductId"
                value={formData.externalProductId}
                onChange={(e) => setFormData({ ...formData, externalProductId: e.target.value })}
                placeholder="e.g., price_1234567890"
                disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
                error={!!fieldErrors.externalProductId}
                hint={fieldErrors.externalProductId || 'Optional Stripe price ID'}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBillingCycle.isPending || updateBillingCycle.isPending}
              >
                {createBillingCycle.isPending || updateBillingCycle.isPending 
                  ? 'Saving...' 
                  : isEditing ? 'Save Changes' : 'Create Billing Cycle'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

