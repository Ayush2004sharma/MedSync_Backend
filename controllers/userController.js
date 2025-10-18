import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import mongoose from 'mongoose';

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ ...req.body, password: hashed });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
    console.log('User registered:', user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "2d" });
    res.status(200).json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, dob, gender, phone, address, image, location } = req.body;
    
    const updateFields = { name, dob, gender, phone, address, image };

    // Update location if provided
    if (location && location.coordinates && Array.isArray(location.coordinates)) {
      updateFields.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
    }

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      updateFields,
      { new: true, runValidators: true, select: '-password' }
    );
    
    if (!updated) {
      console.error("User not found for update");
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get User Dashboard with Statistics
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch user profile
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get appointment statistics using aggregation
    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          booked: {
            $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.find({
      user: userId,
      status: 'booked',
      scheduledFor: { $gte: new Date() }
    })
      .populate('doctor', 'name specialty image')
      .sort({ scheduledFor: 1 })
      .limit(5);

    // Get recent appointments
    const recentAppointments = await Appointment.find({
      user: userId
    })
      .populate('doctor', 'name specialty image')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate stats
    const stats = appointmentStats.length > 0 ? appointmentStats[0] : {
      total: 0,
      pending: 0,
      booked: 0,
      cancelled: 0,
      rejected: 0
    };

    // Build dashboard response
    const dashboard = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        image: user.image,
        location: user.location, // Include location
        createdAt: user.createdAt
      },
      statistics: {
        totalAppointments: stats.total,
        pendingAppointments: stats.pending,
        bookedAppointments: stats.booked,
        cancelledAppointments: stats.cancelled,
        rejectedAppointments: stats.rejected,
        upcomingCount: upcomingAppointments.length
      },
      upcomingAppointments,
      recentAppointments
    };

    res.json(dashboard);
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ message: err.message });
  }
};
