const router = require("express").Router();

const agentController = require("../controllers/agentController");

//public route
router.get("/:id", agentController.getAgentProfile);

module.exports = router;