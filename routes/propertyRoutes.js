const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");

const { verifyToken } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Agent + Admin can create 
router.post(
    "/",
    verifyToken,
    authorizeRoles("admin", "agent"),
    propertyController.createProperty
);

// Only Admin can delete all properties BUT agent can delete only his own property
router.delete(
    "/:id",
    verifyToken,
    authorizeRoles("admin"),
    propertyController.deleteProperty
);

// Public routes
router.get("/homepage", propertyController.getHomepageProperties);
router.get("/", propertyController.getProperties);
router.get("/:id", propertyController.getPropertyById);
router.get("/:id/recommendations", propertyController.getRecommendedProperties);

// Update (Agent + Admin)
router.put(
    "/:id",
    verifyToken,
    authorizeRoles("admin", "agent"),
    propertyController.updateProperty
);


// Agent Route
router.get(
    "/agent/properties",
    verifyToken,
    propertyController.getAgentProperties
);

router.get(
    "/agent/dashboard",
    verifyToken,
    propertyController.getAgentDashboardStats
);

router.post(
    "/:id/report",
    verifyToken,
    propertyController.reportProperty
);

router.post(
    "/:id/images",
    verifyToken,
    authorizeRoles("admin", "agent"),
    propertyController.addPropertyImage
);

router.get(
    "/:id/images",
    propertyController.getPropertyImages
);

router.post(
    "/:id/feature",
    verifyToken,
    authorizeRoles("agent", "admin"),
    propertyController.featureProperty
);

router.post(
    "/feature/:id/pay",
    verifyToken,
    authorizeRoles("agent", "admin"),
    propertyController.payForFeature
);

router.post(
    "/:id/book",
    verifyToken,
    propertyController.createBooking
);

router.put(
    "/bookings/:id/pay",
    verifyToken,
    propertyController.payForBooking
);

router.post(
    "/:id/rooms",
    verifyToken,
    authorizeRoles("agent", "admin"),
    propertyController.createRoom
);


router.post(
    "/rooms/:id/book",
    verifyToken,
    propertyController.bookRoom
);

router.put(
    "/rooms/bookings/:id/pay",
    verifyToken,
    propertyController.payForRoomBooking
);

router.post(
    "/:id/verify-land",
    verifyToken,
    propertyController.requestLandVerification
);

router.put(
    "/land/:id/review",
    verifyToken,
    authorizeRoles("admin"),
    propertyController.reviewLand
);

router.put(
    "/land/:id/pay",
    verifyToken,
    propertyController.payForLandVerification
);




console.log("Property routes loaded");

module.exports = router;