const pool = require("../config/db");

exports.updateProfile = async (req, res) => {
    try{

        const userId = req.user.id;

        const{ name, phone, bio, profile_picture } = req.body;

        const user = await pool.query(
            `UPDATE users
            SET name=$1, phone=$2, bio=$3, profile_picture=$4
            WHERE id=$5
            RETURNING id, name, email, phone, bio, profile_picture`,
            [name, phone, bio, profile_picture, userId]
        );

        res.json(user.rows[0]);

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Get Profile
exports.getProfile = async (req, res) => {
    try{

        const userId = req.user.id;

        const user = await pool.query(
            `SELECT id,name,email,phone,bio,profile_picture
            FROM users
            WHERE id=$1`,
            [userId]
        );

        res.json(user.rows[0]);

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.saveFcmToken = async (req, res) => {
    const userId = req.user.id;
    const { fcm_token } = req.body;

    await pool.query(
        "UPDATE users SET fcm_token=$1 WHERE id=$2",
        [fcm_token, userId]
    );

    res.json({ message: "Token saved" });
};