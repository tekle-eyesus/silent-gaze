require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Imports
const connectDB = require('./config/db');
const chatRoutes = require('./routes/chatRoutes');
const socketHandler = require('./sockets/socketHandler');

// App Config
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json()); // Allow parsing JSON in HTTP requests

// Connect Database
connectDB();

// Routes
app.use('/api/chat', chatRoutes);

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Logic
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});