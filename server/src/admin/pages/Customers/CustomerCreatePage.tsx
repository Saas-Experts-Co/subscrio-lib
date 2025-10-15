import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { CreateCustomerDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function CustomerCreatePage() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();

  const [formData, setFormData] = useState({
    key: '',
    displayName: '',
    email: '',
    externalBillingId: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[-_]+/g, '-')
      .trim();
  };

  const handleDisplayNameChange = (value: string) => {
    if (!keyManuallyEdited && value) {
      setFormData({ ...formData, displayName: value, key: generateKey(value) });
    } else {
      setFormData({ ...formData, displayName: value });
    }
  };

  const handleKeyChange = (value: string) => {
    setFormData({ ...formData, key: value });
    setKeyManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      // Clean up optional fields - convert empty strings to undefined
      const dataToSubmit: CreateCustomerDto = {
        key: formData.key,
        displayName: formData.displayName || undefined,
        email: formData.email.trim() || undefined,
        externalBillingId: formData.externalBillingId || undefined,
      };
      
      await createCustomer.mutateAsync(dataToSubmit);
      toast.success('Customer created successfully');
      navigate('/customers');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to create customer');
      }
    }
  };

  return (
    <>
      <PageMeta title="Create Customer - Subscrio Admin" description="Create a new customer" />
      
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
            Create Customer
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new customer account
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g., John Doe or Acme Corp"
                disabled={createCustomer.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName || 'Optional human-readable name'}
              />
            </div>

            <div>
              <Label>
                Customer Key <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="e.g., user-123 or john-doe"
                disabled={createCustomer.isPending}
                error={!!fieldErrors.key}
                hint={fieldErrors.key || "Auto-generated from display name if provided. Your application's unique identifier for this customer. Cannot be changed after creation."}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
                disabled={createCustomer.isPending}
                error={!!fieldErrors.email}
                hint={fieldErrors.email || 'Optional email address'}
              />
            </div>

            <div>
              <Label>External Billing ID</Label>
              <Input
                value={formData.externalBillingId}
                onChange={(e) => setFormData({ ...formData, externalBillingId: e.target.value })}
                placeholder="e.g., Stripe customer ID (cus_...)"
                disabled={createCustomer.isPending}
                error={!!fieldErrors.externalBillingId}
                hint={fieldErrors.externalBillingId || 'Optional billing provider customer ID (e.g., Stripe customer ID)'}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Link to="/customers">
                <Button type="button" variant="outline" disabled={createCustomer.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

