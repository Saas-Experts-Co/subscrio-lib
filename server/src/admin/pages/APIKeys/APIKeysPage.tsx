import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import { PlusIcon } from '../../icons';

export default function APIKeysPage() {
  return (
    <>
      <PageMeta title="API Keys - Subscrio Admin" description="Manage API keys" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">API Keys</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage API access keys</p>
          </div>
          <Button onClick={() => {}} size="sm">
            <PlusIcon className="size-5" />
            Create API Key
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <p className="text-gray-600 dark:text-gray-400">API key management coming soon...</p>
        </div>
      </div>
    </>
  );
}

