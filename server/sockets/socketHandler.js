const { saveMessageInternal } = require('../controllers/chatController');

module.exports = (io) => {
    io.on('connection', (socket) => {

        // Join Room
        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit('user_joined', socket.id);
        });

        // Chat Logic
        socket.on('send_message', async (data) => {
            // 1. Save to DB first
            const savedMsg = await saveMessageInternal(data);

            // 2. Broadcast to everyone in room (including sender, for confirmation)
            if (savedMsg) {
                io.to(data.roomId).emit('receive_message', savedMsg);
            }
        });

        socket.on('typing_start', (roomId) => {
            socket.to(roomId).emit('display_typing', socket.id);
        });

        socket.on('typing_stop', (roomId) => {
            socket.to(roomId).emit('hide_typing', socket.id);
        });

        // WebRTC Signaling
        socket.on('offer', (payload) => io.to(payload.target).emit('offer', payload));
        socket.on('answer', (payload) => io.to(payload.target).emit('answer', payload));
        socket.on('ice-candidate', (incoming) => io.to(incoming.target).emit('ice-candidate', incoming.candidate));

        socket.on('disconnect', () => {
            // Optional cleanup
        });
    });
};