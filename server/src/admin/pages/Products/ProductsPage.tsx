import { Link } from 'react-router';
import { useState, useMemo } from 'react';
import { useProducts, useDeleteProduct, useArchiveProduct, useActivateProduct } from '@/hooks/useProducts';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PlusIcon, TrashBinIcon, BoxIcon, ArrowUpIcon } from '../../icons';
import { toast } from 'sonner';

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const archiveProduct = useArchiveProduct();
  const activateProduct = useActivateProduct();
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [archiveConfirm, setArchiveConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [activateConfirm, setActivateConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (statusFilter === 'all') return products;
    return products.filter(p => p.status === statusFilter);
  }, [products, statusFilter]);

  const handleArchive = async () => {
    try {
      await archiveProduct.mutateAsync(archiveConfirm.id);
      toast.success('Product archived successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive product');
    }
  };

  const handleActivate = async () => {
    try {
      await activateProduct.mutateAsync(activateConfirm.id);
      toast.success('Product activated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate product');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(deleteConfirm.id);
      toast.success('Product deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Products - Subscrio Admin"
        description="Manage your subscription products"
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
              Products
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your subscription products
            </p>
          </div>
          <Link to="/products/create">
            <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
              Create Product
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="archived">Archived Only</option>
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Key
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts?.map((product) => (
                  <tr
                    key={product.key}
                    className="border-b border-gray-200 dark:border-gray-800 last:border-0"
                  >
                    <td className="px-6 py-4 text-sm">
                      <Link 
                        to={`/products/edit/${product.key}`}
                        className="text-gray-800 dark:text-white/90 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium"
                      >
                        {product.displayName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {product.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'active'
                            ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                            : product.status === 'inactive'
                            ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.status === 'active' && (
                          <Tooltip content="Archive product">
                            <button
                              aria-label="Archive product"
                              onClick={() => setArchiveConfirm({ isOpen: true, id: product.key, name: product.displayName })}
                              className="p-2 text-warning-500 hover:text-warning-600 dark:text-warning-400 transition-colors"
                            >
                              <BoxIcon className="size-4" />
                            </button>
                          </Tooltip>
                        )}
                        {product.status === 'archived' && (
                          <>
                            <Tooltip content="Activate product">
                              <button
                                aria-label="Activate product"
                                onClick={() => setActivateConfirm({ isOpen: true, id: product.key, name: product.displayName })}
                                className="p-2 text-success-500 hover:text-success-600 dark:text-success-400 transition-colors"
                              >
                                <ArrowUpIcon className="size-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete product">
                              <button
                                aria-label="Delete product"
                                onClick={() => setDeleteConfirm({ isOpen: true, id: product.key, name: product.displayName })}
                                className="p-2 text-error-500 hover:text-error-600 dark:text-error-400 transition-colors"
                              >
                                <TrashBinIcon className="size-4" />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {statusFilter === 'all' 
                        ? 'No products found. Create your first product to get started.'
                        : `No ${statusFilter} products found.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={archiveConfirm.isOpen}
        onClose={() => setArchiveConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleArchive}
        title="Archive Product?"
        message={`Are you sure you want to archive "${archiveConfirm.name}"? Archived products can still be viewed but won't be available for new subscriptions.`}
        confirmText="Archive"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={activateConfirm.isOpen}
        onClose={() => setActivateConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleActivate}
        title="Activate Product?"
        message={`Are you sure you want to activate "${activateConfirm.name}"? This will make the product available for new subscriptions.`}
        confirmText="Activate"
        variant="info"
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleDelete}
        title="Delete Product?"
        message={`Are you sure you want to permanently delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

