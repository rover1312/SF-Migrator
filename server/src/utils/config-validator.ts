import { Request, Response, NextFunction } from 'express';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const ajv = new Ajv({ allErrors: true });

// Configuration Schema Definition
const configSchema = {
  type: 'object',
  required: ['version', 'sourceOrg', 'targetOrgs', 'objects'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+$'
    },
    sourceOrg: {
      type: 'object',
      required: ['orgName', 'authType'],
      properties: {
        orgName: { type: 'string', minLength: 1 },
        authType: { 
          type: 'string', 
          enum: ['oauth', 'username_password', 'passkey'] 
        },
        credentials: { type: 'object' }
      }
    },
    targetOrgs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['orgId', 'orgName', 'authType'],
        properties: {
          orgId: { type: 'string', minLength: 1 },
          orgName: { type: 'string', minLength: 1 },
          authType: { 
            type: 'string', 
            enum: ['oauth', 'username_password', 'passkey'] 
          },
          credentials: { type: 'object' },
          isDefault: { type: 'boolean' }
        }
      },
      minItems: 1
    },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['objectApiName', 'order'],
        properties: {
          objectApiName: { type: 'string', minLength: 1 },
          order: { type: 'integer', minimum: 1 },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              required: ['fieldApiName', 'fieldType', 'selected'],
              properties: {
                fieldApiName: { type: 'string', minLength: 1 },
                fieldType: { type: 'string' },
                selected: { type: 'boolean' }
              }
            }
          },
          filter: { type: 'string' },
          crudPermissions: {
            type: 'object',
            properties: {
              Create: { type: 'boolean' },
              Read: { type: 'boolean' },
              Update: { type: 'boolean' },
              Delete: { type: 'boolean' }
            }
          }
        }
      },
      minItems: 1
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const validate: ValidateFunction = ajv.compile(configSchema);

export interface ConfigValidationError {
  message: string;
  path?: string;
  details?: ErrorObject[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  config?: any;
}

/**
 * Validates configuration file content based on file extension
 */
export const validateConfigFile = async (
  filePath: string
): Promise<ValidationResult> => {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        errors: [{ message: 'Configuration file not found' }]
      };
    }

    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    let config: any;

    // Parse file based on extension
    if (fileExtension === 'json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      config = JSON.parse(content);
    } else if (['yaml', 'yml'].includes(fileExtension || '')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      config = yaml.load(content);
    } else {
      return {
        isValid: false,
        errors: [{ message: 'Unsupported file format. Please use .json, .yaml, or .yml' }]
      };
    }

    // Validate against schema
    const valid = validate(config);
    
    if (!valid) {
      const errors: ConfigValidationError[] = validate.errors?.map((err: ErrorObject) => ({
        message: err.message || 'Unknown validation error',
        path: err.instancePath,
        details: [err]
      })) || [];

      return {
        isValid: false,
        errors,
        config
      };
    }

    // Additional business logic validation
    const businessErrors = validateBusinessRules(config);
    if (businessErrors.length > 0) {
      return {
        isValid: false,
        errors: businessErrors,
        config
      };
    }

    return {
      isValid: true,
      errors: [],
      config
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        message: `Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
};

/**
 * Validates configuration from raw content string
 */
export const validateConfigContent = async (
  content: string,
  fileType: 'json' | 'yaml' | 'yml'
): Promise<ValidationResult> => {
  try {
    let config: any;

    if (fileType === 'json') {
      config = JSON.parse(content);
    } else {
      config = yaml.load(content);
    }

    // Validate against schema
    const valid = validate(config);
    
    if (!valid) {
      const errors: ConfigValidationError[] = validate.errors?.map((err: ErrorObject) => ({
        message: err.message || 'Unknown validation error',
        path: err.instancePath,
        details: [err]
      })) || [];

      return {
        isValid: false,
        errors,
        config
      };
    }

    // Additional business logic validation
    const businessErrors = validateBusinessRules(config);
    if (businessErrors.length > 0) {
      return {
        isValid: false,
        errors: businessErrors,
        config
      };
    }

    return {
      isValid: true,
      errors: [],
      config
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        message: `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
};

/**
 * Additional business rule validations beyond schema
 */
const validateBusinessRules = (config: any): ConfigValidationError[] => {
  const errors: ConfigValidationError[] = [];

  // Check that at least one target org exists
  if (!config.targetOrgs || config.targetOrgs.length === 0) {
    errors.push({
      message: 'At least one target organization is required',
      path: '/targetOrgs'
    });
  }

  // Check that at least one object is defined
  if (!config.objects || config.objects.length === 0) {
    errors.push({
      message: 'At least one Salesforce object is required',
      path: '/objects'
    });
  }

  // Check for duplicate target org IDs
  const orgIds = config.targetOrgs?.map((org: any) => org.orgId) || [];
  const uniqueOrgIds = new Set(orgIds);
  if (orgIds.length !== uniqueOrgIds.size) {
    errors.push({
      message: 'Duplicate target organization IDs detected',
      path: '/targetOrgs'
    });
  }

  // Check object order uniqueness
  const orders = config.objects?.map((obj: any) => obj.order) || [];
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    errors.push({
      message: 'Duplicate object order values detected',
      path: '/objects'
    });
  }

  // Validate each object has at least one field if fields are specified
  config.objects?.forEach((obj: any, index: number) => {
    if (obj.fields && obj.fields.length === 0) {
      errors.push({
        message: `Object "${obj.objectApiName}" has no fields selected`,
        path: `/objects/${index}/fields`
      });
    }
  });

  return errors;
};

/**
 * Middleware to validate uploaded configuration
 */
export const configValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      errors: [{ message: 'No configuration file uploaded' }]
    });
  }

  const filePath = req.file.path;
  
  validateConfigFile(filePath)
    .then((result) => {
      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          errors: result.errors
        });
      }
      
      // Attach validated config to request for downstream handlers
      (req as any).validatedConfig = result.config;
      next();
    })
    .catch((error) => {
      res.status(500).json({
        success: false,
        errors: [{ message: `Validation failed: ${error.message}` }]
      });
    });
};

export default {
  validateConfigFile,
  validateConfigContent,
  configValidationMiddleware,
  validate
};
