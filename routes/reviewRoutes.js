const router = require("express").Router();

const reviewController = require("../controllers/reviewController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/:id", verifyToken, reviewController.addReview);
router.get("/:id", reviewController.getPropertyReviews);

module.exports = router;