const { io } = require("socket.io-client");

//Get user from terminal
const userId = process.argv[2];

if (!userId) {
    console.log("Please provide userId");
    process.exit();
}

//Smart URL handling
const socket = io(process.env.SOCKET_URL || "http://localhost:5000");

socket.on("connect", () => {
    console.log(`Connected as User ${userId}:`, socket.id);

    socket.emit("join", userId);
});

socket.on("notification", (data) => {
    console.log(`User ${userId} got notification:`, data);
});

socket.on("new_message", (data) => {
    console.log(`User ${userId} got message:`, data);
});

socket.on("typing", (data) => {
    console.log(`User ${data.senderId} is typing...`);
});

socket.on("online_users", (users) => {
    console.log("Online users:", users);
});

socket.on("message_seen", (data) => {
    console.log("Message seen", data);
});