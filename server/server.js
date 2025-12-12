require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const chatRoutes = require('./routes/chatRoutes');
const socketHandler = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

connectDB();

// USE THE NEW ROUTES
app.use('/api/chat', chatRoutes);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

socketHandler(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));