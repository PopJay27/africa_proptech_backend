require("dotenv").config();

const express = require("express");
const cors = require("cors");
require("./config/db");


//NEW (Socket)
const http = require("http");
const { Server } = require("socket.io");


const propertyRoutes = require("./routes/propertyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const searchRoutes = require("./routes/searchRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const agentRoutes = require("./routes/agentRoutes");

const authRoutes = require('./routes/authRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

//HTTP SERVER 
const server = http.createServer(app);


const onlineUsers = new Map();


//SOCKET SETUP
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

//Make io accessible everywhere
global.io = io;

//Socket connection 
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room`);

        onlineUsers.set(userId, socket.id);

         //Broadcast online users
        io.emit("online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
        for(let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }

        io.emit("online_users", Array.from(onlineUsers.keys()));
    });


    //Typing Indicator
    socket.on("typing", ({ senderId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit("typing", { 
        senderId,
        isTyping: true
     });
});

socket.on("stop_typing", ({ senderId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit("typing", {
        senderId,
        isTyping: false
    });
});

});


//Middlewares
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/properties", propertyRoutes);

app.use("/api/admin", adminRoutes);

app.use('/api/auth', authRoutes);

app.use("/api/favorites", require("./routes/favorites"));

app.use("/api/search", searchRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/users", userRoutes);

app.use("/api/agents", agentRoutes);


//Test Route
app.get("/", (req, res) => {
    res.send("Africa PropTech API is running");
});

//Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});