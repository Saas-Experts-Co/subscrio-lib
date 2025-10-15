import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Define the OpenAPI specification for Subscrio API
 * This is manually maintained to match src/api/index.ts
 */
const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Subscrio API',
    version: '1.0.0',
    description: 'Subscription management API for Subscrio',
    contact: {
      name: 'Subscrio Support'
    }
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server'
    },
    {
      url: 'https://api.example.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for external integrations'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from admin login'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'archived'] },
          displayOrder: { type: 'number' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Feature: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          valueType: { type: 'string', enum: ['toggle', 'numeric', 'text'] },
          defaultValue: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Plan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productKey: { type: 'string' },
          key: { type: 'string' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'archived'] },
          displayOrder: { type: 'number' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customerKey: { type: 'string' },
          planKey: { type: 'string' },
          productKey: { type: 'string' },
          status: { type: 'string', enum: ['active', 'trial', 'cancelled', 'expired', 'suspended'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      BillingCycle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          displayName: { type: 'string' },
          intervalType: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
          intervalCount: { type: 'number' },
          trialDays: { type: 'number' },
          stripePriceId: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/openapi.json': {
      get: {
        summary: 'Get OpenAPI specification',
        tags: ['Documentation'],
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Admin login',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  passphrase: { type: 'string' }
                },
                required: ['passphrase']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Invalid passphrase', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products': {
      get: {
        summary: 'List all products',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new product',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  displayName: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['key', 'displayName']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' }
              }
            }
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Product already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{key}': {
      get: {
        summary: 'Get a product by key',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Product details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a product',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' }
              }
            }
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete a product',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Product deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{key}/archive': {
      post: {
        summary: 'Archive a product',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Product archived', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{key}/activate': {
      post: {
        summary: 'Activate a product',
        tags: ['Products'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Product activated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/features': {
      get: {
        summary: 'List all features',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'List of features', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Feature' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new feature',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  displayName: { type: 'string' },
                  valueType: { type: 'string', enum: ['toggle', 'numeric', 'text'] },
                  defaultValue: { type: 'string' }
                },
                required: ['key', 'displayName', 'valueType', 'defaultValue']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Feature created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Feature' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Feature already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/features/{key}': {
      get: {
        summary: 'Get a feature by key',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Feature details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Feature' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Feature not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a feature',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  description: { type: 'string' },
                  defaultValue: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Feature updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Feature' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Feature not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete a feature',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Feature deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Feature not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/features': {
      get: {
        summary: 'Get features by product',
        tags: ['Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'productKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of features', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Feature' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/plans': {
      get: {
        summary: 'List all plans',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'List of plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new plan',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productKey: { type: 'string' },
                  key: { type: 'string' },
                  displayName: { type: 'string' }
                },
                required: ['productKey', 'key', 'displayName']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Plan created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plan' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Plan already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans': {
      get: {
        summary: 'Get plans by product',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'productKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans/{planKey}': {
      get: {
        summary: 'Get a plan by key',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Plan details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plan' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a plan',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Plan updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plan' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete a plan',
        tags: ['Plans'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Plan deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans/{planKey}/features': {
      get: {
        summary: 'Get plan features',
        tags: ['Plan Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Plan features', content: { 'application/json': { schema: { type: 'array' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans/{planKey}/features/{featureKey}': {
      get: {
        summary: 'Get plan feature value',
        tags: ['Plan Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'featureKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Feature value', content: { 'application/json': { schema: { type: 'object', properties: { value: { type: 'string' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Set plan feature value',
        tags: ['Plan Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'featureKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  value: { type: 'string' }
                },
                required: ['value']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Feature value set', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Remove plan feature value',
        tags: ['Plan Features'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'featureKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Feature value removed', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/customers': {
      get: {
        summary: 'List all customers',
        tags: ['Customers'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'List of customers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new customer',
        tags: ['Customers'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['key']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Customer created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Customer already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/customers/{key}': {
      get: {
        summary: 'Get a customer by key',
        tags: ['Customers'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Customer details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a customer',
        tags: ['Customers'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Customer updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/subscriptions': {
      get: {
        summary: 'List all subscriptions',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'List of subscriptions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new subscription',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customerKey: { type: 'string' },
                  planKey: { type: 'string' },
                  productKey: { type: 'string' }
                },
                required: ['customerKey', 'planKey', 'productKey']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Subscription created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/subscriptions/{key}': {
      get: {
        summary: 'Get a subscription by key',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Subscription details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Subscription not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a subscription',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Subscription updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Subscription not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/subscriptions/{key}/cancel': {
      post: {
        summary: 'Cancel a subscription',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Subscription cancelled', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Subscription not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/customers/{customerKey}/subscriptions': {
      get: {
        summary: 'Get subscriptions by customer',
        tags: ['Subscriptions'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'customerKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of subscriptions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/customers/{customerKey}/features/{featureKey}/value': {
      get: {
        summary: 'Get feature value for customer',
        tags: ['Feature Checker'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'customerKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'featureKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Feature value', content: { 'application/json': { schema: { type: 'object', properties: { value: { type: 'string' }, isEnabled: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/customers/{customerKey}/features': {
      get: {
        summary: 'Get all features for customer',
        tags: ['Feature Checker'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'customerKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'All features', content: { 'application/json': { schema: { type: 'object' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans/{planKey}/billing-cycles': {
      get: {
        summary: 'Get billing cycles by plan',
        tags: ['Billing Cycles'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'List of billing cycles', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/BillingCycle' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a billing cycle',
        tags: ['Billing Cycles'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  displayName: { type: 'string' },
                  intervalType: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
                  intervalCount: { type: 'number' }
                },
                required: ['key', 'displayName', 'intervalType', 'intervalCount']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Billing cycle created', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingCycle' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{productKey}/plans/{planKey}/billing-cycles/{key}': {
      get: {
        summary: 'Get a billing cycle by key',
        tags: ['Billing Cycles'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Billing cycle details', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingCycle' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Billing cycle not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update a billing cycle',
        tags: ['Billing Cycles'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  trialDays: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Billing cycle updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingCycle' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Billing cycle not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete a billing cycle',
        tags: ['Billing Cycles'],
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'productKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planKey', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Billing cycle deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Billing cycle not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'Admin authentication' },
    { name: 'Products', description: 'Product management' },
    { name: 'Features', description: 'Feature management' },
    { name: 'Plans', description: 'Plan management' },
    { name: 'Plan Features', description: 'Plan feature value management' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Subscriptions', description: 'Subscription management' },
    { name: 'Feature Checker', description: 'Feature resolution for customers' },
    { name: 'Billing Cycles', description: 'Billing cycle management' },
    { name: 'Documentation', description: 'API documentation' }
  ]
};

// Write to file
const outputPath = resolve(__dirname, '../openapi.json');
writeFileSync(outputPath, JSON.stringify(openapiSpec, null, 2), 'utf-8');

console.log('✅ Generated openapi.json');
console.log(`   📄 ${outputPath}`);
console.log('   ℹ️  Run tests to verify: pnpm test');

