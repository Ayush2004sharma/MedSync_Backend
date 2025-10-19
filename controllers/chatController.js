import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';

// Generate unique conversation ID
const getConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const conversationId = getConversationId(userId, otherUserId);
    
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name image profilePic')
      .populate('receiver', 'name image profilePic')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all conversations for a user - FIXED VERSION
export const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Getting conversations for user:', userId);
    
    const conversations = await Conversation.find({
      participants: userId
    }).sort({ lastMessageTime: -1 });

    console.log(`✅ Found ${conversations.length} conversations`);

    // Manually populate participants from both User and Doctor models
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const convObj = conv.toObject();
        
        // Populate each participant
        const populatedParticipants = await Promise.all(
          convObj.participants.map(async (participantId) => {
            // Try User model first
            let participant = await User.findById(participantId)
              .select('name email image profilePic')
              .lean();
            
            // If not found in User, try Doctor model
            if (!participant) {
              participant = await Doctor.findById(participantId)
                .select('name email image profilePic specialty')
                .lean();
            }
            
            return participant;
          })
        );
        
        // Filter out nulls and add back to conversation
        convObj.participants = populatedParticipants.filter(p => p !== null);
        
        return convObj;
      })
    );

    console.log(`✅ Populated ${populatedConversations.length} conversations`);
    if (populatedConversations.length > 0) {
      console.log('First conversation participants:', populatedConversations[0].participants.map(p => p.name));
    }

    res.json({ success: true, conversations: populatedConversations });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    
    await Message.updateMany(
      { conversationId, receiver: userId, isRead: false },
      { isRead: true }
    );

    await Conversation.updateOne(
      { participants: userId },
      { $set: { [`unreadCount.${userId}`]: 0 } }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    const conversationId = getConversationId(senderId, receiverId);

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      message,
      conversationId
    });

    await newMessage.save();
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/chat-attachments/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadChatFile = upload.single('file');

export const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/chat-attachments/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
