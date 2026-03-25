const admin = require("../config/firebase");
const pool = require("../config/db");

exports.sendPushNotification = async (userId, title, body) => {
    try {
        const user = await pool.query(
            "SELECT fcm_token FROM users WHERE id=$1",
            [userId]
        );

        const token = user.rows[0]?.fcm_token;

        if (!token) return;

        const message = {
            notification: {
                title,
                body,
            },
            token,
        };

        await admin.messaging().send(message);

    } catch (error) {
        console.error("Push notification error:", error);
    }
};