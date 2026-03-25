const pool = require("../config/db");

exports.getAgentProfile = async (req, res) => {
    try {

        const agentId = req.params.id;

        //Get agent info
        const agent = await pool.query(
            `SELECT id, name, email, phone, bio, profile_picture
            FROM users
            WHERE id = $1 AND role = 'agent'`,
            [agentId]
        );

        if(agent.rows.length === 0) {
            return res.status(404).json({
                message: "Agent not found"
            });
        }

        //Get agent properties
        const properties = await pool.query(
            `SELECT *
            FROM properties
            WHERE user_id = $1
            ORDER BY created_at DESC`,
            [agentId]
        );

        //Count properties
        const totalProperties = properties.rows.length;

        res.json({
            agent: agent.rows[0],
            total_properties: totalProperties,
            properties: properties.rows
        });

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};