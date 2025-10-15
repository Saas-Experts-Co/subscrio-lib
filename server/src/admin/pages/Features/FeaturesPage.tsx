import { Link } from 'react-router';
import { useState } from 'react';
import { useFeatures, useDeleteFeature } from '@/hooks/useFeatures';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PlusIcon, TrashBinIcon } from '../../icons';
import { toast } from 'sonner';

export default function FeaturesPage() {
  const { data: features, isLoading } = useFeatures();
  const deleteFeature = useDeleteFeature();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const handleDelete = async () => {
    try {
      await deleteFeature.mutateAsync(deleteConfirm.id);
      toast.success('Feature deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete feature');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  return (
    <>
      <PageMeta title="Features - Subscrio Admin" description="Manage subscription features" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Features</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your feature flags and limits</p>
          </div>
          <Link to="/features/create">
            <Button size="sm" startIcon={<PlusIcon className="size-5" />}>
              Create Feature
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
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Default Value</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {features?.map((feature) => (
                  <tr key={feature.key} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                    <td className="px-6 py-4 text-sm">
                      <Link 
                        to={`/features/edit/${feature.key}`}
                        className="text-gray-800 dark:text-white/90 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium"
                      >
                        {feature.displayName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {feature.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        feature.valueType === 'toggle' ? 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400' :
                        feature.valueType === 'numeric' ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' :
                        'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                      }`}>
                        {feature.valueType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {feature.defaultValue}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip content="Delete feature">
                          <button
                            aria-label="Delete feature"
                            onClick={() => setDeleteConfirm({ isOpen: true, id: feature.key, name: feature.displayName })}
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
        title="Delete Feature?"
        message={`Are you sure you want to permanently delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

