// Get Pending Properties
const pool = require("../config/db");

exports.getPendingProperties = async (req, res) => {
    try{
        const result = await pool.query(
            "SELECT * FROM properties WHERE verification_status = 'pending'"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Approve Property
exports.approveProperty = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            "UPDATE properties SET verification_status = 'approved' WHERE id = $1",
            [id]
        );

        res.json({ message: "Property approved successfully" });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Reject Property
exports.rejectProperty = async (req, res) => {

    const { id } = req.params;

    try {
        await pool.query(
            "UPDATE properties SET verification_status = 'rejected' WHERE id = $1",
            [id]
        );

        res.json({ message: "Property rejected" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


exports.getReports = async (req, res) => {
    try {

        const reports = await pool.query(`
            SELECT 
            reports.id,
            reports.reason,
            reports.description,
            reports.created_at,
            properties.title,
            users.email AS reported_by
            FROM reports 
            JOIN properties ON reports.property_id = properties.id
            JOIN users ON reports.reported_by = users.id
            ORDER BY reports.created_at DESC
            `);

            res.json(reports.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};