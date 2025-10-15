import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCreateFeature, useFeatures } from '@/hooks/useFeatures';
import { CreateFeatureDto } from '@subscrio/core';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Textarea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { ChevronLeftIcon } from '../../icons';
import { toast } from 'sonner';
import { parseValidationErrors, type FieldErrors } from '@/lib/formValidation';

export default function FeatureCreatePage() {
  const navigate = useNavigate();
  const createFeature = useCreateFeature();
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
    key: '',
    displayName: '',
    description: '',
    valueType: 'toggle' as 'toggle' | 'numeric' | 'text',
    defaultValue: 'false',
    groupName: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[-_]+/g, '-')
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
      await createFeature.mutateAsync(formData as CreateFeatureDto);
      toast.success('Feature created successfully');
      navigate('/features');
    } catch (error: any) {
      const errors = parseValidationErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        toast.error(error.message || 'Failed to create feature');
      }
    }
  };

  return (
    <>
      <PageMeta title="Create Feature - Subscrio Admin" description="Create a new feature" />
      
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
            Create Feature
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new subscription feature
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
                placeholder="e.g., Max Projects"
                disabled={createFeature.isPending}
                error={!!fieldErrors.displayName}
                hint={fieldErrors.displayName}
              />
            </div>

            <div>
              <Label>
                Feature Key <span className="text-error-500">*</span>
              </Label>
              <Input
                value={formData.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="e.g., max-projects"
                disabled={createFeature.isPending}
                error={!!fieldErrors.key}
                hint={fieldErrors.key || 'Auto-generated from display name. Alphanumeric with hyphens/underscores only. Cannot be changed after creation.'}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Optional description for this feature"
                disabled={createFeature.isPending}
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
                  let newDefaultValue = '';
                  if (newType === 'toggle') {
                    newDefaultValue = 'false';
                  } else if (newType === 'numeric') {
                    newDefaultValue = '0';
                  }
                  setFormData({ ...formData, valueType: newType, defaultValue: newDefaultValue });
                }}
                disabled={createFeature.isPending}
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
                    disabled={createFeature.isPending}
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
                </>
              ) : formData.valueType === 'numeric' ? (
                <Input
                  id="defaultValue"
                  type="number"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="e.g., 10"
                  disabled={createFeature.isPending}
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
                  disabled={createFeature.isPending}
                  error={!!fieldErrors.defaultValue}
                  hint={fieldErrors.defaultValue || 'Enter any text value'}
                />
              )}
              {formData.valueType === 'toggle' && !fieldErrors.defaultValue && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select true or false
                </p>
              )}
            </div>

            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                placeholder="e.g., Projects"
                disabled={createFeature.isPending}
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
                <Button type="button" variant="outline" disabled={createFeature.isPending}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createFeature.isPending}>
                {createFeature.isPending ? 'Creating...' : 'Create Feature'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

