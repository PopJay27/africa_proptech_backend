const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const adminController = require("../controllers/adminController");

router.get(
    "/properties/pending",
    verifyToken,
    authorizeRoles("admin"),
    adminController.getPendingProperties
);

router.put(
    "/properties/:id/approve",
    verifyToken,
    authorizeRoles("admin"),
    adminController.approveProperty
);

router.put(
    "/properties/:id/reject",
    verifyToken,
    authorizeRoles("admin"),
    adminController.rejectProperty
);

router.get(
    "/reports",
    verifyToken,
    authorizeRoles("admin"),
    adminController.getReports
);

module.exports = router;