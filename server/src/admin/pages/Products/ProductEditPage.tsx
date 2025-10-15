import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { UpdateProductDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function ProductEditPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(key!);
  const updateProduct = useUpdateProduct();

  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (product) {
      setFormData({
        displayName: product.displayName,
        description: product.description || '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      await updateProduct.mutateAsync({ key: key!, data: formData as UpdateProductDto });
      toast.success('Product updated successfully');
      navigate('/products');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to update product');
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  if (!product) {
    return <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">Product not found</p>
    </div>;
  }

  return (
    <>
      <PageMeta title="Edit Product - Subscrio Admin" description="Edit product details" />
      
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
            Edit Product: {product.displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update product details
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <Label>Product Key</Label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <code className="text-sm text-gray-700 dark:text-gray-300">{product.key}</code>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Product key cannot be changed
              </p>
            </div>

            <div>
              <Label>
                Display Name <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={updateProduct.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                disabled={updateProduct.isPending}
                rows={4}
                error={!!fieldErrors.description}
                hint={fieldErrors.description}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Link to="/products">
                <Button type="button" variant="outline" disabled={updateProduct.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

