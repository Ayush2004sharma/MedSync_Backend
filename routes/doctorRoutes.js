import express from 'express';
import { 
  registerDoctor, 
  loginDoctor, 
  getDoctorById, 
  getDoctorProfile, 
  updateDoctorProfile, 
  getAllDoctors,
  searchDoctors 
} from '../controllers/doctorController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

router.post('/register', registerDoctor);
router.post('/login', loginDoctor);

router.get('/profile', authenticateJWT, getDoctorProfile);
router.patch('/profile/:id', authenticateJWT, updateDoctorProfile);

router.get('/search', searchDoctors); // Add search route
router.get('/all', getAllDoctors);
router.get('/:id', getDoctorById);

export default router;
