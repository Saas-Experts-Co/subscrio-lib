/**
 * Parse validation error from API response into field-level errors
 */
export function parseValidationErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // Check if error has the expected structure
  if (error && typeof error === 'object') {
    // If error.errors exists (Zod validation error structure)
    if (Array.isArray(error.errors)) {
      error.errors.forEach((err: any) => {
        if (err.path && err.path.length > 0) {
          // Get the field name from the path (e.g., ['displayName'] -> 'displayName')
          const field = String(err.path[0]);
          // Store the error message for this field
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        } else if (err.message) {
          // If no path, try to extract field from message
          const extractedField = extractFieldFromMessage(err.message);
          if (extractedField && !fieldErrors[extractedField]) {
            fieldErrors[extractedField] = err.message;
          }
        }
      });
    }
    // Fallback: If error.message contains field-specific hints
    else if (error.message && typeof error.message === 'string') {
      const extractedField = extractFieldFromMessage(error.message);
      if (extractedField) {
        fieldErrors[extractedField] = error.message;
      }
    }
  }

  return fieldErrors;
}

/**
 * Helper function to extract field name from error message
 */
function extractFieldFromMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Map of common field identifiers to actual field names
  const fieldMap: Record<string, string> = {
    'subscription key': 'key',
    'subscriptionkey': 'key',
    'display name': 'displayName',
    'displayname': 'displayName',
    'product key': 'productKey',
    'productkey': 'productKey',
    'product': 'productKey',
    'customer key': 'customerKey',
    'customerkey': 'customerKey',
    'customer': 'customerKey',
    'plan key': 'planKey',
    'plankey': 'planKey',
    'plan': 'planKey',
    'feature key': 'featureKey',
    'featurekey': 'featureKey',
    'billing cycle key': 'billingCycleKey',
    'billingcyclekey': 'billingCycleKey',
    'billing cycle': 'billingCycleKey',
    'value type': 'valueType',
    'valuetype': 'valueType',
    'default value': 'defaultValue',
    'defaultvalue': 'defaultValue',
    'duration value': 'durationValue',
    'durationvalue': 'durationValue',
    'duration unit': 'durationUnit',
    'durationunit': 'durationUnit',
    'external billing id': 'externalBillingId',
    'externalbillingid': 'externalBillingId',
    'external product id': 'externalProductId',
    'externalproductid': 'externalProductId',
    'group name': 'groupName',
    'groupname': 'groupName',
    'key': 'key',
    'email': 'email',
    'description': 'description'
  };

  // Try to find field name in the message
  for (const [pattern, fieldName] of Object.entries(fieldMap)) {
    if (lowerMessage.includes(pattern)) {
      return fieldName;
    }
  }

  return null;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  return error && (error.name === 'ValidationError' || (error.errors && Array.isArray(error.errors)));
}

/**
 * Generic field error state type
 */
export type FieldErrors = Record<string, string>;

