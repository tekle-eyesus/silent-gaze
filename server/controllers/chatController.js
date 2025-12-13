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

const saveMessageInternal = async (data) => {
    try {
        return await Message.create({
            roomId: data.roomId,
            senderId: data.senderId,
            text: data.text,
            type: data.type || 'text'
        });
    } catch (error) {
        console.error(error);
        return null;
    }
};

const sendMessage = async (req, res) => {
    try {
        const { roomId, senderId, text, type } = req.body;
        const newMessage = await Message.create({ roomId, senderId, text, type: type || 'text' });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json(error);
    }
};


module.exports = { getMessages, sendMessage, saveMessageInternal };