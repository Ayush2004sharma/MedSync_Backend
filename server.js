import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import appointmentRoutes from './routes/appointmentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import connectDB from './config/mongodb.js';

import Message from './models/message.js';
import Conversation from './models/Conversation.js';

const app = express();
connectDB();

const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://med-sync-sigma.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);

const getConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

const activeUsers = new Map();

// Socket.IO Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId || decoded.doctorId || decoded.id || decoded._id;
    
    if (!socket.userId) {
      return next(new Error('Invalid token structure'));
    }
    
    console.log(`✅ Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`✅ User connected with ID: ${socket.userId}`);
  
  if (!socket.userId) {
    socket.disconnect();
    return;
  }
  
  activeUsers.set(socket.userId, socket.id);
  io.emit('user-online', { userId: socket.userId });
  socket.join(socket.userId);

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { receiverId, message, file } = data;
      const senderId = socket.userId;
      
      console.log(`📤 Sending message from ${senderId} to ${receiverId}`);
      
      const conversationId = getConversationId(senderId, receiverId);
      const participants = [senderId, receiverId].sort();

      // Save message
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        message,
        conversationId,
        file: file || undefined
      });

      await newMessage.save();
      await newMessage.populate('sender', 'name image profilePic');
      await newMessage.populate('receiver', 'name image profilePic');

      console.log('✅ Message saved:', newMessage._id);

      // Create or update conversation
      let conversation = await Conversation.findOne({
        participants: { $all: participants }
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: participants,
          lastMessage: message || 'Sent a file',
          lastMessageTime: new Date(),
          unreadCount: new Map([[receiverId, 1]])
        });
        await conversation.save();
        console.log('✅ New conversation created');
      } else {
        conversation.lastMessage = message || 'Sent a file';
        conversation.lastMessageTime = new Date();
        
        const currentUnread = conversation.unreadCount?.get(receiverId) || 0;
        conversation.unreadCount.set(receiverId, currentUnread + 1);
        
        await conversation.save();
        console.log('✅ Conversation updated');
      }

      // Send to receiver
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', newMessage);
        console.log('✅ Sent to receiver');
      }

      socket.emit('message-sent', newMessage);

    } catch (error) {
      console.error('❌ Error:', error.message);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle typing
  socket.on('typing', (data) => {
    const receiverSocketId = activeUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    }
  });

  // Handle mark as read
  socket.on('mark-read', async (data) => {
    try {
      const { conversationId } = data;
      const userId = socket.userId;
      
      await Message.updateMany(
        { conversationId, receiver: userId, isRead: false },
        { isRead: true }
      );

      await Conversation.updateOne(
        { participants: userId },
        { $set: { [`unreadCount.${userId}`]: 0 } }
      );

      socket.emit('messages-marked-read', { conversationId });
    } catch (error) {
      console.error('❌ Error marking read:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    activeUsers.delete(socket.userId);
    io.emit('user-offline', { userId: socket.userId });
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Socket.io ready`);
});
