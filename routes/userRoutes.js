import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  getUserDashboard,
  getUserById  // ✅ Add this import
} from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Profile routes (authenticated)
router.get('/profile', authenticateJWT, getUserProfile);
router.patch('/profile', authenticateJWT, updateUserProfile);

// Dashboard route with all statistics (authenticated)
router.get('/dashboard', authenticateJWT, getUserDashboard);

// ✅ Get user by ID (for chat - no auth needed)
router.get('/:id', getUserById);

export default router;
