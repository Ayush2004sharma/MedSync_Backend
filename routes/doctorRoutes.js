import express from 'express';
import { 
  registerDoctor, 
  loginDoctor, 
  getDoctorById, 
  getDoctorProfile, 
  updateDoctorProfile,  
  getAllDoctors,
  searchDoctorsByProximity,
  searchDoctorsAdvanced,
  getSpecialties,  // Make sure this is imported
  getSpecialtiesWithRatings
} from '../controllers/doctorController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

router.post('/register', registerDoctor);
router.post('/login', loginDoctor);

router.get('/profile', authenticateJWT, getDoctorProfile);
router.patch('/profile', authenticateJWT, updateDoctorProfile);

// IMPORTANT: This must come BEFORE /all and /:id
router.get('/specialties', getSpecialties);
router.get('/specialties/ratings', getSpecialtiesWithRatings);

router.get('/search/proximity', searchDoctorsByProximity);
router.get('/search/advanced', searchDoctorsAdvanced);

router.get('/all', getAllDoctors);
router.get('/:id', getDoctorById);

export default router;
