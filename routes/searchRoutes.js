const router = require("express").Router();

const searchController = require("../controllers/searchController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/save", verifyToken, searchController.saveSearch);
router.get("/saved", verifyToken, searchController.getSavedSearches);
router.delete("/:id", verifyToken, searchController.deleteSavedSearch);

module.exports = router;