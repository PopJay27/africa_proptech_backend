const router = require("express").Router();

const messageController = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/send", verifyToken, messageController.sendMessage);
router.get("/conversation/:userId", verifyToken, messageController.getConversation);
router.get("/my-messages", verifyToken, messageController.getUserMessages);
router.get("/conversations", verifyToken, messageController.getUserConversations);
router.get("/conversation/:conversationId/messages", verifyToken, messageController.getMessagesByConversation);

router.put("/message/seen", verifyToken, messageController.markMessageSeen);
router.put("/message/edit", verifyToken, messageController.editMessage);
router.delete("/message/delete", verifyToken, messageController.deleteMessage);
router.post("/message/react", verifyToken, messageController.reactToMessage);

module.exports = router;