import { Router } from 'express';
import multer from 'multer';
import { validateConfigFile, validateConfigContent, configValidationMiddleware } from '../utils/config-validator';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.json', '.yaml', '.yml'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON and YAML files are allowed.'));
    }
  }
});

/**
 * POST /api/config/export
 * Export current migration configuration as JSON/YAML
 */
router.post('/export', async (req, res) => {
  try {
    const { format = 'json', config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data is required'
      });
    }

    let content: string;
    const contentType = format === 'yaml' ? 'text/yaml' : 'application/json';
    const extension = format === 'yaml' ? 'yaml' : 'json';

    if (format === 'yaml') {
      const yaml = await import('js-yaml');
      content = yaml.dump(config, { indent: 2 });
    } else {
      content = JSON.stringify(config, null, 2);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="sf-migrator-config.${extension}"`);
    
    res.json({
      success: true,
      content,
      filename: `sf-migrator-config.${extension}`,
      format
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * POST /api/config/import
 * Import configuration from uploaded file (JSON/YAML)
 */
router.post('/import', upload.single('configFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        errors: [{ message: 'No configuration file uploaded' }]
      });
    }

    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    const fileType = fileExtension as 'json' | 'yaml' | 'yml';
    
    if (!['json', 'yaml', 'yml'].includes(fileType || '')) {
      return res.status(400).json({
        success: false,
        errors: [{ message: 'Unsupported file format. Please use .json, .yaml, or .yml' }]
      });
    }

    const content = req.file.buffer.toString('utf-8');
    const result = await validateConfigContent(content, fileType);

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        errors: result.errors,
        message: 'Configuration validation failed'
      });
    }

    // Config is valid, return it for the frontend to use
    res.json({
      success: true,
      config: result.config,
      message: 'Configuration imported successfully',
      summary: generateConfigSummary(result.config)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [{ message: `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}` }]
    });
  }
});

/**
 * POST /api/config/validate
 * Validate configuration without importing
 */
router.post('/validate', upload.single('configFile'), async (req, res) => {
  try {
    if (!req.file) {
      // Try to validate from request body
      const { config } = req.body;
      if (!config) {
        return res.status(400).json({
          success: false,
          errors: [{ message: 'No configuration provided' }]
        });
      }

      const result = await validateConfigContent(JSON.stringify(config), 'json');
      
      return res.json({
        success: result.isValid,
        errors: result.errors,
        message: result.isValid ? 'Configuration is valid' : 'Configuration validation failed'
      });
    }

    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    const fileType = fileExtension as 'json' | 'yaml' | 'yml';
    const content = req.file.buffer.toString('utf-8');
    
    const result = await validateConfigContent(content, fileType);

    res.json({
      success: result.isValid,
      errors: result.errors,
      message: result.isValid ? 'Configuration is valid' : 'Configuration validation failed',
      summary: result.isValid ? generateConfigSummary(result.config) : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [{ message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }]
    });
  }
});

/**
 * GET /api/config/summary
 * Generate a summary of the current configuration
 */
router.post('/summary', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data is required'
      });
    }

    const summary = generateConfigSummary(config);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Generate a human-readable summary of the configuration
 */
function generateConfigSummary(config: any) {
  return {
    version: config.version,
    sourceOrg: {
      name: config.sourceOrg?.orgName,
      authType: config.sourceOrg?.authType
    },
    targetOrgsCount: config.targetOrgs?.length || 0,
    targetOrgs: config.targetOrgs?.map((org: any) => ({
      name: org.orgName,
      isDefault: org.isDefault || false
    })) || [],
    objectsCount: config.objects?.length || 0,
    objects: config.objects?.map((obj: any, index: number) => ({
      order: obj.order,
      name: obj.objectApiName,
      fieldsCount: obj.fields?.filter((f: any) => f.selected).length || 0,
      hasFilter: !!obj.filter
    })) || [],
    totalFieldsSelected: config.objects?.reduce((acc: number, obj: any) => 
      acc + (obj.fields?.filter((f: any) => f.selected).length || 0), 0) || 0,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}

export default router;
