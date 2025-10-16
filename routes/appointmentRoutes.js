import express from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import {
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  getUserAppointments,
  getDoctorAppointments,
  deleteAppointment,
  approveAppointment
} from '../controllers/appointmentController.js';

const router = express.Router();

// Get available slots for a doctor
router.get('/:doctorId/slots', authenticateJWT, getAvailableSlots);

// Book an appointment
router.post('/:doctorId', authenticateJWT, bookAppointment);

// Get appointments for logged-in user (removed :userId param)
router.get('/user', authenticateJWT, getUserAppointments);

// Get appointments for logged-in doctor
router.get('/doctor', authenticateJWT, getDoctorAppointments);

// Doctor approves or rejects a pending appointment
router.patch('/:appointmentId/approve', authenticateJWT, approveAppointment);

// Cancel an appointment
router.patch('/:id/cancel', authenticateJWT, cancelAppointment);

// Delete an appointment
router.delete('/:id/delete', authenticateJWT, deleteAppointment);

export default router;
