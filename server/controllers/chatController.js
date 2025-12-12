const Message = require('../models/Message');

// Get history
const getMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Save new message
const sendMessage = async (req, res) => {
    try {
        const { roomId, senderId, text } = req.body;
        const newMessage = await Message.create({ roomId, senderId, text });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Helper for Socket.io (Internal use)
const saveMessageInternal = async (data) => {
    try {
        return await Message.create({
            roomId: data.roomId,
            senderId: data.senderId,
            text: data.text
        });
    } catch (error) {
        console.error(error);
        return null;
    }
};

module.exports = { getMessages, sendMessage, saveMessageInternal };