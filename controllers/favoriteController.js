const pool = require("../config/db");

//Add property to favorite
exports.addFavorite = async (req, res) => {
    try {

        const userId = req.user.id;
        const { property_id } = req.body;

        const result = await pool.query(
            "INSERT INTO favorites (user_id, property_id) VALUES ($1,$2) RETURNING*",
            [userId, property_id]
        );

        res.json(result.rows[0]);

    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({ message: "Property already in favorites" });
        }

        res.status(500).json({ error: error.message });
    }
};


//Get all favorite for a user
exports.getFavorites = async (req, res) => {
    try {

        const userId = req.user.id;

        const result = await pool.query(
            `SELECT properties.*
            FROM favorites
            JOIN properties
            ON favorites.property_id = properties.id
            WHERE favorites.user_id = $1`,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//Remove favorite
exports.removeFavorite = async (req, res) => {

    try {

        const userId = req.user.id;
        const { property_id } = req.params;

        await pool.query(
            "DELETE FROM favorites WHERE user_id=$1 AND property_id=$2",
            [userId, property_id]
        );

        res.json({ message: "Removed from favorites" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};