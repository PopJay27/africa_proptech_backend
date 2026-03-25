const pool = require("../config/db");


//Save Search
exports.saveSearch = async (req, res) => {
    try{

        const userId = req.user.id;

        const {
            location,
            property_type,
            listing_type,
            min_price,
            max_price,
            bedrooms
        } = req.body;

        const result = await pool.query(
            `INSERT INTO saved_searches
            (user_id, location, property_type, listing_type, min_price, max_price, bedrooms)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *`,
            [userId, location, property_type, listing_type, min_price, max_price, bedrooms]
        );

        res.status(201).json({
            message: "Search saved successfully",
            search: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Get Saved Searches
exports.getSavedSearches = async (req, res) => {
    try {

        const userId =req.user.id;

        const searches = await pool.query(
            "SELECT * FROM saved_searches WHERE user_id=$1 ORDER BY created_at DESC",
            [userId]
        );

        res.json(searches.rows);

    } catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Delete Saved Search
exports.deleteSavedSearch = async (req, res) => {
    try{

        const searchId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            "DELETE FROM saved_searches WHERE id=$1 AND user_id=$2",
            [searchId,userId]
        );

        res.json({
            message: "Saved search deleted"
        });

    } catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};