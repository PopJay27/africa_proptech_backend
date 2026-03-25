const router = require("express").Router();

const favoriteController = require("../controllers/favoriteController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, favoriteController.addFavorite);
router.get("/", verifyToken, favoriteController.getFavorites);
router.delete("/:property_id", verifyToken, favoriteController.removeFavorite);

module.exports = router;