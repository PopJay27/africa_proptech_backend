const pool = require("../config/db");

//Get user notifications
exports.getNotifications = async (req, res) => {

    try {

        const userId = req.user.id;

        const result = await pool.query(
            `
            SELECT *
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Mark notification as Read
exports.markAsRead = async (req, res) => {
    try {

        const notificationId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            "UPDATE notifications SET is_read = true WHERE id=$1 AND user_id=$2",
            [notificationId, userId]
        );

        res.json({
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};