import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useFeature, useUpdateFeature, useFeatures } from '@/hooks/useFeatures';
import { UpdateFeatureDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function FeatureEditPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data: feature, isLoading } = useFeature(key!);
  const updateFeature = useUpdateFeature();
  const { data: allFeatures } = useFeatures();

  const existingGroupNames = useMemo(() => {
    if (!allFeatures) return [];
    const groups = new Set(
      allFeatures
        .map(f => f.groupName)
        .filter(g => g && g.trim() !== '')
    );
    return Array.from(groups).sort();
  }, [allFeatures]);

  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    valueType: 'toggle' as 'toggle' | 'numeric' | 'text',
    defaultValue: '',
    groupName: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (feature) {
      setFormData({
        displayName: feature.displayName,
        description: feature.description || '',
        valueType: feature.valueType as any,
        defaultValue: feature.defaultValue,
        groupName: feature.groupName || '',
      });
    }
  }, [feature]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    try {
      await updateFeature.mutateAsync({ key: key!, data: formData as UpdateFeatureDto });
      toast.success('Feature updated successfully');
      navigate('/features');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to update feature');
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>;
  }

  if (!feature) {
    return <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">Feature not found</p>
    </div>;
  }

  return (
    <>
      <PageMeta title="Edit Feature - Subscrio Admin" description="Edit feature details" />
      
      <div className="space-y-6">
        <div>
          <Link
            to="/features"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ChevronLeftIcon className="size-5" />
            Back to features
          </Link>
          
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Edit Feature: {feature.displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update feature details
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <Label>Feature Key</Label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <code className="text-sm text-gray-700 dark:text-gray-300">{feature.key}</code>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Feature key cannot be changed
              </p>
            </div>

            <div>
              <Label>
                Display Name <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={updateFeature.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                disabled={updateFeature.isPending}
                rows={3}
                error={!!fieldErrors.description}
                hint={fieldErrors.description}
              />
            </div>

            <div>
              <Label htmlFor="valueType">
                Value Type <span className="text-error-500">*</span>
              </Label>
              <select
                id="valueType"
                aria-label="Value Type"
                value={formData.valueType}
                onChange={(e) => {
                  const newType = e.target.value as 'toggle' | 'numeric' | 'text';
                  // Reset default value based on new type
                  let newDefaultValue = formData.defaultValue;
                  if (newType === 'toggle' && formData.defaultValue !== 'true' && formData.defaultValue !== 'false') {
                    newDefaultValue = 'false';
                  } else if (newType === 'numeric' && isNaN(Number(formData.defaultValue))) {
                    newDefaultValue = '0';
                  }
                  setFormData({ ...formData, valueType: newType, defaultValue: newDefaultValue });
                }}
                disabled={updateFeature.isPending}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="toggle">Toggle (true/false)</option>
                <option value="numeric">Numeric</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div>
              <Label htmlFor="defaultValue">
                Default Value <span className="text-error-500">*</span>
              </Label>
              {formData.valueType === 'toggle' ? (
                <>
                  <select
                    id="defaultValue"
                    aria-label="Default Value"
                    value={formData.defaultValue}
                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                    disabled={updateFeature.isPending}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:text-white ${
                      fieldErrors.defaultValue
                        ? 'border-error-500 focus:border-error-300 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
                        : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700'
                    }`}
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                  {fieldErrors.defaultValue && (
                    <p className="mt-1.5 text-xs text-error-500">{fieldErrors.defaultValue}</p>
                  )}
                  {!fieldErrors.defaultValue && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select true or false</p>
                  )}
                </>
              ) : formData.valueType === 'numeric' ? (
                <Input
                  id="defaultValue"
                  type="number"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="e.g., 10"
                  disabled={updateFeature.isPending}
                  step="any"
                  error={!!fieldErrors.defaultValue}
                  hint={fieldErrors.defaultValue || 'Enter a numeric value (can be decimal)'}
                />
              ) : (
                <Input
                  id="defaultValue"
                  type="text"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="e.g., basic"
                  disabled={updateFeature.isPending}
                  error={!!fieldErrors.defaultValue}
                  hint={fieldErrors.defaultValue || 'Enter any text value'}
                />
              )}
            </div>

            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                disabled={updateFeature.isPending}
                list="group-names"
                error={!!fieldErrors.groupName}
                hint={fieldErrors.groupName || 'Optional category for organizing features. Select from existing groups or type a new one.'}
              />
              <datalist id="group-names">
                {existingGroupNames.map((groupName) => (
                  <option key={groupName} value={groupName} />
                ))}
              </datalist>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Link to="/features">
                <Button type="button" variant="outline" disabled={updateFeature.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={updateFeature.isPending}>
                {updateFeature.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

