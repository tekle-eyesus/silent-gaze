const Message = require('../models/Message');

const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;

        const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(50);
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const saveMessage = async (data) => {
    try {
        const newMessage = await Message.create({
            roomId: data.roomId,
            senderId: data.senderId,
            text: data.text,
        });
        return newMessage;
    } catch (error) {
        console.error("Error saving message:", error);
        return null;
    }
};

module.exports = { getRoomMessages, saveMessage };