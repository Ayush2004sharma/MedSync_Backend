import { Appointment } from '../models/Appointment.js';
import { DoctorWeeklySchedule } from '../models/DoctorAvailabilty.js';
import mongoose from 'mongoose';

// Helper to format time slots
const formatSlot = (slot) => `${slot.startTime} - ${slot.endTime}`;

// Get available slots for a doctor on a specific date
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const doctorSchedule = await DoctorWeeklySchedule.findOne({ doctor: doctorId });
    if (!doctorSchedule) return res.status(404).json({ message: "Doctor schedule not found" });

    const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
    const day = dayMap[new Date(date).getDay()];
    const daySchedule = doctorSchedule.schedule[day];

    if (!daySchedule.active) return res.json({ availableSlots: [] });

    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      scheduledFor: { $gte: startOfDay, $lte: endOfDay },
      status: "booked"
    });

    const bookedSlots = bookedAppointments.map(a => formatSlot({
      startTime: a.scheduledFor.toTimeString().slice(0,5),
      endTime: a.scheduledFor.toTimeString().slice(0,5)
    }));

    const availableSlots = daySchedule.slots.filter(slot => !bookedSlots.includes(formatSlot(slot)));
    res.json({ availableSlots });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Book an appointment (starts with status "pending")
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { scheduledFor, notes } = req.body;

    // FIX: Extract userId from JWT token (set by authenticateJWT middleware)
    const userId = req.user.userId || req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    const appointmentDate = new Date(scheduledFor);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Check if slot already booked
    const existing = await Appointment.findOne({
      doctor: doctorId,
      scheduledFor: appointmentDate,
      status: "booked"
    });
    if (existing) return res.status(400).json({ message: "Slot already booked" });

    const appointment = await Appointment.create({
      user: userId, // Use userId from JWT token
      doctor: doctorId,
      scheduledFor: appointmentDate,
      notes,
      status: "pending"
    });

    res.status(201).json({ 
      message: "Appointment booked successfully, pending doctor approval", 
      appointment 
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "This slot is already booked" });
    }
    console.error("Error booking appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor approval/rejection of pending appointment
export const approveAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { approve } = req.body;  // true = approve, false = reject

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status !== "pending") {
      return res.status(400).json({ message: "Only pending appointments can be approved or rejected" });
    }

    appointment.status = approve ? "booked" : "rejected";
    await appointment.save();

    res.json({ message: `Appointment ${approve ? "approved" : "rejected"} successfully`, appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel appointment (user can cancel pending or booked)
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status !== "pending" && appointment.status !== "booked") {
      return res.status(400).json({ message: "Only pending or booked appointments can be cancelled" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get appointments for a user
export const getUserAppointments = async (req, res) => {
  try {
    // FIX: Extract userId from JWT token instead of URL params
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    const appointments = await Appointment.find({ user: userId })
      .populate('doctor', 'name specialty');

    // Don't return 404 for empty arrays, just return empty array
    res.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Error in getUserAppointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get appointments for a doctor including pending and booked
export const getDoctorAppointments = async (req, res) => {
  try {
    // FIX: Extract doctorId from JWT token
    const doctorId = req.user.doctorId || req.user.id || req.user._id;
    
    if (!doctorId) {
      return res.status(401).json({ message: "Doctor ID not found in token" });
    }

    console.log("Doctor ID being queried:", doctorId);

    const appointments = await Appointment.find({
      doctor: new mongoose.Types.ObjectId(doctorId),
      status: { $in: ["pending", "booked"] }
    }).populate('user', 'name email');

    console.log("Appointments found:", appointments.length);
    res.json({ appointments: appointments || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an appointment (optional)
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await Appointment.findByIdAndDelete(id);
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
