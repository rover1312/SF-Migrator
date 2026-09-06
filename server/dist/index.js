"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const objects_routes_1 = __importDefault(require("./routes/objects.routes"));
const fields_routes_1 = __importDefault(require("./routes/fields.routes"));
const extract_routes_1 = __importDefault(require("./routes/extract.routes"));
const validate_routes_1 = __importDefault(require("./routes/validate.routes"));
const load_routes_1 = __importDefault(require("./routes/load.routes"));
const config_routes_1 = __importDefault(require("./routes/config.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const PORT = config_1.config.port || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/objects', objects_routes_1.default);
app.use('/api/fields', fields_routes_1.default);
app.use('/api/extract', extract_routes_1.default);
app.use('/api/validate', validate_routes_1.default);
app.use('/api/load', load_routes_1.default);
app.use('/api/config', config_routes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use(error_middleware_1.errorMiddleware);
// Start server
if (config_1.config.nodeEnv !== 'test') {
    app.listen(PORT, () => {
        logger_1.logger.info(`SF-Migrator Server running on port ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map