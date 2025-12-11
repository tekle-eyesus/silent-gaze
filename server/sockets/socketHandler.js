const { saveMessage } = require('../controllers/chatController');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // --- ROOM MANAGEMENT ---
        socket.on('join_room', (roomId) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            const size = room ? room.size : 0;

            if (size >= 2) {
                socket.emit('room_full');
                return;
            }

            socket.join(roomId);
            console.log(`User ${socket.id} joined room: ${roomId}`);

            // If there is already someone there, tell them a partner joined
            if (size === 1) {
                socket.to(roomId).emit('user_joined', socket.id); // Triggers WebRTC
            }
        });

        // --- CHAT MESSAGING ---
        socket.on('send_message', async (data) => {
            await saveMessage(data);

            socket.to(data.roomId).emit('receive_message', data);
        });


        socket.on('offer', (payload) => {
            // payload: { target: 'socketId-to-send-to', caller: 'my-socket-id', sdp: '...' }
            io.to(payload.target).emit('offer', payload);
        });

        socket.on('answer', (payload) => {
            io.to(payload.target).emit('answer', payload);
        });

        socket.on('ice-candidate', (incoming) => {
            io.to(incoming.target).emit('ice-candidate', incoming.candidate);
        });

        // ---  CLEANUP ---
        socket.on('disconnect', () => {
            console.log('User Disconnected', socket.id);
        });
    });
};

module.exports = socketHandler;