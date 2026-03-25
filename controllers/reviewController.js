const pool = require("../config/db");


//Add review 
exports.addReview = async (req, res) => {
    try{

        const propertyId = req.params.id;
        const userId = req.user.id;
        const { rating, comment } = req.body;

        const review = await pool.query(
            `INSERT INTO reviews (property_id,user_id,rating,comment)
            VALUES ($1,$2,$3,$4)
            RETURNING *`,
            [propertyId,userId,rating,comment]
        );

        res.status(201).json(review.rows[0]);

    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Get property Reviews
exports.getPropertyReviews = async (req, res) => {
    try{

        const propertyId = req.params.id;

        const reviews = await pool.query(
            `SELECT reviews.*, users.name
            FROM reviews
            JOIN users
            ON reviews.user_id = users.id
            WHERE property_id=$1
            ORDER BY created_at DESC`,
            [propertyId]
        );

        res.json(reviews.rows);

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};