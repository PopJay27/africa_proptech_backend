const pool = require("../config/db");

exports.checkSavedSearchMatches = async (property) => {
    try {

        const searches = await pool.query(
            `SELECT * FROM saved_searches
            WHERE 
            (location IS NULL OR location ILIKE $1)
            AND (property_type IS NULL OR property_type = $2)
            AND (listing_type IS NULL OR listing_type = $3)
            AND (min_price IS NULL OR $4 >= min_price)
            AND (max_price IS NULL OR $4 <= max_price)
            AND (bedrooms IS NULL OR $5 >= bedrooms)`,
            [
                `%${property.location}%`,
                property.property_type,
                property.listing_type,
                property.price,
                property.bedrooms
            ]
        );

        const notificationService = require("./notificationService");

        //Notifications
    for (const search of searches.rows) {

    await notificationService.createNotification({
        userId: search.user_id,
        message: "A property matches your saved search",
        type: "alert",
        referenceId: property.id
    });
    
}

    } catch (error) {
        console.error("Alert Service Error:", error);
    }
};