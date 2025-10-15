import { usePlans, useArchivePlan, useDeletePlan } from '@/hooks/usePlans';
import { useState } from 'react';
import { Link } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PlusIcon, BoxIcon, TrashBinIcon } from '../../icons';
import { toast } from 'sonner';

export default function PlansPage() {
  const { data: plans, isLoading } = usePlans();
  const archivePlan = useArchivePlan();
  const deletePlan = useDeletePlan();
  
  const [archiveConfirm, setArchiveConfirm] = useState<{ isOpen: boolean; productKey: string; planKey: string; name: string }>({
    isOpen: false,
    productKey: '',
    planKey: '',
    name: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; productKey: string; planKey: string; name: string }>({
    isOpen: false,
    productKey: '',
    planKey: '',
    name: '',
  });

  const handleArchive = async () => {
    try {
      await archivePlan.mutateAsync({ 
        productKey: archiveConfirm.productKey, 
        planKey: archiveConfirm.planKey 
      });
      toast.success('Plan archived successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive plan');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync({ 
        productKey: deleteConfirm.productKey, 
        planKey: deleteConfirm.planKey 
      });
      toast.success('Plan deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete plan');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  return (
    <>
      <PageMeta title="Plans - Subscrio Admin" description="Manage subscription plans" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Plans</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your subscription plans</p>
          </div>
          <Link to="/plans/create">
            <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
              Create Plan
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
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans?.map((plan) => (
                  <tr key={`${plan.productKey}-${plan.key}`} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <td className="px-6 py-4 text-sm">
                      <Link 
                        to={`/plans/edit/${plan.productKey}/${plan.key}`}
                        className="text-gray-800 dark:text-white/90 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium"
                      >
                        {plan.displayName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {plan.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'active' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {plan.status === 'active' && (
                          <Tooltip content="Archive plan">
                            <button
                              aria-label="Archive plan"
                              onClick={() => setArchiveConfirm({ 
                                isOpen: true, 
                                productKey: plan.productKey, 
                                planKey: plan.key, 
                                name: plan.displayName 
                              })}
                              className="p-2 text-warning-500 hover:text-warning-600 dark:text-warning-400 transition-colors"
                            >
                              <BoxIcon className="size-4" />
                            </button>
                          </Tooltip>
                        )}
                        {plan.status === 'archived' && (
                          <Tooltip content="Delete plan">
                            <button
                              aria-label="Delete plan"
                              onClick={() => setDeleteConfirm({ 
                                isOpen: true, 
                                productKey: plan.productKey, 
                                planKey: plan.key, 
                                name: plan.displayName 
                              })}
                              className="p-2 text-error-500 hover:text-error-600 dark:text-error-400 transition-colors"
                            >
                              <TrashBinIcon className="size-4" />
                            </button>
                          </Tooltip>
                        )}
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
        isOpen={archiveConfirm.isOpen}
        onClose={() => setArchiveConfirm({ isOpen: false, productKey: '', planKey: '', name: '' })}
        onConfirm={handleArchive}
        title="Archive Plan?"
        message={`Are you sure you want to archive "${archiveConfirm.name}"? Archived plans can still be viewed but won't be available for new subscriptions.`}
        confirmText="Archive"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, productKey: '', planKey: '', name: '' })}
        onConfirm={handleDelete}
        title="Delete Plan?"
        message={`Are you sure you want to permanently delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

