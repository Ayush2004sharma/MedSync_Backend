import express from 'express';
import { 
  getChatHistory, 
  getConversations, 
  getUserById, 

  markAsRead, 
  sendMessage, 
  
} from '../controllers/chatController.js';

const router = express.Router();

// Chat routes
router.get('/messages/:userId/:otherUserId', getChatHistory);
router.get('/conversations/:userId', getConversations);
router.patch('/read', markAsRead);
router.post('/send', sendMessage);

// User route - more specific path
router.get('/user/:id', getUserById);

export default router;
