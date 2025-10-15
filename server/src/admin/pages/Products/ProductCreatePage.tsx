import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateProduct } from '@/hooks/useProducts';
import { CreateProductDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  const [formData, setFormData] = useState({
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
      await createProduct.mutateAsync(formData as CreateProductDto);
      toast.success('Product created successfully');
      navigate('/products');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to create product');
      }
    }
  };

  return (
    <>
      <PageMeta title="Create Product - Subscrio Admin" description="Create a new product" />
      
      <div className="space-y-6">
        <div>
          <Link
            to="/products"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ChevronLeftIcon className="size-5" />
            Back to products
          </Link>
          
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Create Product
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new subscription product
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <Label>
                Display Name <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g., Project Management"
                disabled={createProduct.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName}
              />
            </div>

            <div>
              <Label>
                Product Key <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="e.g., project-management"
                disabled={createProduct.isPending}
                error={!!fieldErrors.key}
                hint={fieldErrors.key || 'Auto-generated from display name. Lowercase letters, numbers, and hyphens only. Cannot be changed after creation.'}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Optional description for this product"
                disabled={createProduct.isPending}
                rows={4}
                error={!!fieldErrors.description}
                hint={fieldErrors.description}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Link to="/products">
                <Button type="button" variant="outline" disabled={createProduct.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

