require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/silent-gaze')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Socket Logic
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // 1. Join a specific meeting room
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
        socket.to(roomId).emit('user_joined', socket.id);
    });

    // 2. Chat Message Handling
    socket.on('send_message', (data) => {
        socket.to(data.roomId).emit('receive_message', data);
    });

    // 3. WebRTC Signaling (The handshake)
    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (incoming) => {
        io.to(incoming.target).emit('ice-candidate', incoming.candidate);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

server.listen(3001, () => {
    console.log('SERVER RUNNING ON PORT 3001');
});