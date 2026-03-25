const pool = require("../config/db");


exports.createNotification = async ({
    userId,
    message,
    type,
    referenceId
}) => {
    try {

    const pushService = require("./pushNotificationService");

    const result = await pool.query(
        `INSERT INTO notifications (user_id, message, type, reference_id)
        VALUES ($1,$2,$3,$4)
        RETURNING *`,
        [userId, message, type, referenceId]
    );

    await pushService.sendPushNotification(
        userId,
        "New Notification",
        message
    );
    
    // REAL TIME PUSH
    if (global.io) {
        global.io.to(`user_${userId}`).emit("notification", result.rows[0]);
    }

    return result.rows[0];
  
   } catch (error) {
       console.error("Notification error:", error);
   }
   
};