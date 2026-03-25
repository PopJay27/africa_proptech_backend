const pool = require("../config/db");

//Send Message
exports.sendMessage = async (req, res) => {
    try {

        const senderId = req.user.id;
        const { receiver_id, property_id, message, media_url, media_type } = req.body;


        //Conversation
        let conversation = await pool.query(
            `SELECT * FROM conversations
            WHERE (user_one=$1 AND user_two=$2)
            OR (user_one=$2 AND user_two=$1)`,
            [senderId, receiver_id]
        );

        if (conversation.rows.length === 0) {
            conversation = await pool.query(
                `INSERT INTO conversations (user_one, user_two)
                VALUES ($1,$2)
                RETURNING *`,
                [senderId, receiver_id]
            );
        }

        const conversationId = conversation.rows[0].id;

        const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, property_id, message, conversation_id, media_url, media_type)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *`,
            [senderId, receiver_id, property_id, message, conversationId, media_url, media_type]
        );


        //Unread message count
        await pool.query(
            `UPDATE conversations
            SET last_message=$1, last_message_time=NOW()
            WHERE id=$2`,
            [message, conversationId]
        );

        

        const newMessage = result.rows[0]; 
        
        //Real-time message
        if (global.io) {
            global.io.to(`user_${receiver_id}`).emit("new_message", newMessage);
        }


        //Check if receiver is online
        if (global.io && onlineUsers.has(String(receiver_id))) {
            await pool.query(
                "UPDATE messages SET status='delivered' WHERE id=$1",
                [newMessage.id]
            );

            newMessage.status = "delivered";
        }

        // Creat notification 
        const notificationService = require("../services/notificationService");

        await notificationService.createNotification({
            userId: receiver_id,
            message: "You received a new message",
            type: "message",
            referenceId: newMessage.id
        });

        res.status(201).json(newMessage);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



//Get User Conversations
exports.getUserConversations = async (req, res) => {
    try{
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT c.*,
            u1.name as user_one_name,
            u2.name as user_two_name,

            --COUNT UNREAD MESSAGES
            (
            SELECT COUNT(*) FROM messages m
            WHERE m.conversation_id = c.id
            AND m.receiver_id = $1
            AND m.is_seen = false
            ) as unread_count

            FROM conversations c
            JOIN users u1 ON c.user_one = u1.id
            JOIN users u2 ON c.user_two = u2.id

            WHERE c.user_one=$1 OR c.user_two=$1
            ORDER BY c.last_message_time DESC`,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};




//Messages by conversations
exports.getMessagesByConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT * FROM messages
            WHERE conversation_id=$1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};




// Get conversation between two users
exports.getConversation = async (req, res) => {
    try {

        const userId = req.user.id;
        const otherUserId = req.params.userId;

        const messages = await pool.query(
            `SELECT * FROM messages
            WHERE
            (sender_id = $1 AND receiver_id = $2)
            OR
            (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC`,
            [userId, otherUserId]
        );

        res.json(messages.rows);

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Get all messages for a user
exports.getUserMessages = async (req, res) => {
    try {

        const userId = req.user.id;

        const messages = await pool.query(
            `SELECT * FROM messages
            WHERE sender_id=$1 OR receiver_id=$1
            ORDER BY created_at DESC`,
            [userId]
        );

        res.json(messages.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


exports.markMessageSeen = async (req, res) => {
    try {
        const { messageId } = req.body;

        await pool.query(
            "UPDATE messages SET is_seen = true, status='seen' WHERE id=$1",
            [messageId]
        );

        //Get sender of the message
        const msg = await pool.query(
            "SELECT sender_id FROM messages WHERE id=$1",
            [messageId]
        );

        const senderId = msg.rows[0].sender_id;

        
        // notify only the sender
        if (global.io) {
            global.io.to(`user_${senderId}`).emit("message_seen", { messageId });
        }


        //Mark message as delivered 
        if (global.io) {
            global.io.to(`user_${senderId}`).emit("message_delivered", { messageId });
        }

        res.json({ message: "Message marked as seen" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.deleteMessage = async (req, res) => {
    const { messageId } = req.body;

    await pool.query(
        "UPDATE messages SET message='This message was deleted' WHERE id=$1",
        [messageId]
    );

    if (global.io) {
        global.io.emit("message_deleted", { messageId });
    }

    res.json({ message: "Deleted" });
};



exports.editMessage = async (req, res) => {
    const { messageId, newMessage } = req.body;

    await pool.query(
        "UPDATE messages SET message=$1 WHERE id=$2",
        [newMessage, messageId]
    );

    if (global.io) {
        global.io.emit("message_edited", { messageId, newMessage });
    }

    res.json({ message: "Edited" });
};



exports.reactToMessage = async (req, res) => {
    const { messageId, reaction, userId } = req.body;

    const message = await pool.query(
        "SELECT reactions FROM messages WHERE id=$1",
        [messageId]
    );

    let reactions = message.rows[0].reactions || {};

    reactions[userId] = reaction;

    await pool.query(
        "UPDATE messages SET reactions=$1 WHERE id=$2",
        [reactions, messageId]
    );

    if (global.io) {
        global.io.emit("message_reaction", { messageId, reactions });
    }

    res.json({ reactions });
};