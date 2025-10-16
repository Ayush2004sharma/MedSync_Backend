import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  getUserDashboard // Import new controller
} from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateJWT, getUserProfile);
router.patch('/profile', authenticateJWT, updateUserProfile);

// Dashboard route with all statistics
router.get('/dashboard', authenticateJWT, getUserDashboard);

export default router;
