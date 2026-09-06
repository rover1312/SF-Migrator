"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Placeholder route - to be implemented
router.post('/export', (req, res) => {
    res.json({ success: true, config: {} });
});
router.post('/import', (req, res) => {
    res.json({ success: true, message: 'Config imported' });
});
exports.default = router;
//# sourceMappingURL=config.routes.js.map