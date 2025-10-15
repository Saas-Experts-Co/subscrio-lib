import { Link } from 'react-router';
import { useState } from 'react';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PlusIcon, TrashBinIcon } from '../../icons';
import { toast } from 'sonner';

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(deleteConfirm.id);
      toast.success('Customer deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete customer');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  return (
    <>
      <PageMeta title="Customers - Subscrio Admin" description="Manage customers" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Customers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your customers</p>
          </div>
          <Link to="/customers/create">
            <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
              Create Customer
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Key</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers?.map((customer) => (
                  <tr key={customer.key} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <td className="px-6 py-4 text-sm">
                      <Link 
                        to={`/customers/edit/${customer.key}`}
                        className="text-gray-800 dark:text-white/90 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium"
                      >
                        {customer.displayName || customer.key}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {customer.key}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {customer.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.status === 'active' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip content="Delete customer">
                          <button
                            aria-label="Delete customer"
                            onClick={() => setDeleteConfirm({ isOpen: true, id: customer.key, name: customer.displayName || customer.key })}
                            className="p-2 text-error-500 hover:text-error-600 dark:text-error-400 transition-colors"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={handleDelete}
        title="Delete Customer?"
        message={`Are you sure you want to permanently delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

