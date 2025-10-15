import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useProducts } from '@/hooks/useProducts';
import { useCreatePlan } from '@/hooks/usePlans';
import { CreatePlanDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs/Tabs';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function PlanCreatePage() {
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const createPlan = useCreatePlan();

  const [formData, setFormData] = useState({
    productKey: '',
    key: '',
    displayName: '',
    description: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleDisplayNameChange = (value: string) => {
    if (!keyManuallyEdited) {
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
      await createPlan.mutateAsync(formData as CreatePlanDto);
      toast.success('Plan created successfully');
      navigate('/plans');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to create plan');
      }
    }
  };

  return (
    <>
      <PageMeta title="Create Plan - Subscrio Admin" description="Create a new subscription plan" />
      
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
            Create Plan
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Key:
            </span>
            <code className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
              {formData.key || 'auto-generated'}
            </code>
            {formData.displayName && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.displayName}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <Tabs defaultValue="properties">
            <TabsList className="px-6 pt-6">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="productKey">
                    Product <span className="text-error-500">*</span>
                  </Label>
                  <select
                    id="productKey"
                    aria-label="Select product"
                    value={formData.productKey}
                    onChange={(e) => setFormData({ ...formData, productKey: e.target.value })}
                    disabled={createPlan.isPending}
                    className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90 ${
                      fieldErrors.productKey
                        ? 'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-800'
                    }`}
                    required
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
                </div>

                <div>
                  <Label>
                    Display Name <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="e.g., Pro Plan"
                    disabled={createPlan.isPending}
                    error={!!fieldErrors.displayName}
                    hint={fieldErrors.displayName}
                  />
                </div>

                <div>
                  <Label>
                    Plan Key <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    value={formData.key}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="e.g., pro-plan"
                    disabled={createPlan.isPending}
                    error={!!fieldErrors.key}
                    hint={fieldErrors.key || 'Auto-generated from display name. Lowercase letters, numbers, and hyphens only.'}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Optional description"
                    disabled={createPlan.isPending}
                    rows={3}
                    error={!!fieldErrors.description}
                    hint={fieldErrors.description}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Link to="/plans">
                    <Button type="button" variant="outline" disabled={createPlan.isPending}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={createPlan.isPending}>
                    {createPlan.isPending ? 'Creating...' : 'Create Plan'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="features" className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Features can be managed after creating the plan
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

