import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { toast } from 'sonner';

export default function FeatureCheckerPage() {
  const [customerExternalId, setCustomerExternalId] = useState('');
  const [featureKey, setFeatureKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ value: any; isEnabled: boolean } | null>(null);
  const [allFeatures, setAllFeatures] = useState<Record<string, string> | null>(null);

  const handleCheckFeature = async () => {
    if (!customerExternalId || !featureKey) {
      toast.error('Please enter both customer ID and feature key');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setAllFeatures(null);

    try {
      const data = await apiClient.featureChecker.getValue(customerExternalId, featureKey);
      setResult(data);
      toast.success('Feature checked successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to check feature');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAllFeatures = async () => {
    if (!customerExternalId) {
      toast.error('Please enter customer ID');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setAllFeatures(null);

    try {
      const data = await apiClient.featureChecker.getAll(customerExternalId);
      setAllFeatures(data.allFeatures);
      toast.success('Retrieved all features');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get features');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Feature Checker - Subscrio Admin" description="Check feature access for customers" />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">Feature Checker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check feature access and values for customers</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <div className="max-w-2xl space-y-6">
            <div>
              <Label>Customer External ID <span className="text-error-500">*</span></Label>
              <Input
                value={customerExternalId}
                onChange={(e) => setCustomerExternalId(e.target.value)}
                placeholder="customer-123"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label>Feature Key</Label>
              <Input
                value={featureKey}
                onChange={(e) => setFeatureKey(e.target.value)}
                placeholder="max-projects"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty to get all features for the customer
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCheckFeature} size="sm" disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Check Feature'}
              </Button>
              <Button onClick={handleGetAllFeatures} size="sm" variant="outline" disabled={isLoading}>
                Get All Features
              </Button>
            </div>

            {/* Single Feature Result */}
            {result && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
                  Result for {featureKey}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Value:</span>
                    <code className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-medium text-gray-800 dark:text-white/90">
                      {String(result.value)}
                    </code>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Enabled:</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      result.isEnabled 
                        ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                        : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400'
                    }`}>
                      {result.isEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* All Features Result */}
            {allFeatures && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
                  All Features for {customerExternalId}
                </h3>
                <div className="space-y-2">
                  {Object.entries(allFeatures).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <code className="text-sm text-gray-700 dark:text-gray-300">{key}</code>
                      <code className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-medium text-gray-800 dark:text-white/90">
                        {value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!result && !allFeatures && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter a customer external ID and optionally a feature key to check access.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

