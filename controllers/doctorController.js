import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Doctor } from '../models/Doctor.js';

// Register Doctor
export const registerDoctor = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Doctor.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const doctor = new Doctor({ ...req.body, password: hashed });
    await doctor.save();

    res.status(201).json({ message: 'Doctor registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login Doctor
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ doctorId: doctor._id }, process.env.JWT_SECRET, { expiresIn: "2d" });
    res.status(200).json({ token, doctor: { name: doctor.name, email: doctor.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get doctor profile by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// controllers/doctorController.js
export const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.doctorId).select('-password');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDoctorProfile = async (req, res) => {
  try {
    // Only allow certain fields to be updated
    const {
      name,
      specialty,
      qualifications,
      bio,
      clinicAddress,
      phone,
      experience,
      fee,
      image,
      status,
      location // Expect `location` as { type: 'Point', coordinates: [lng, lat] }
    } = req.body;

    const updateFields = {
      name,
      specialty,
      qualifications,
      bio,
      clinicAddress,
      phone,
      experience,
      fee,
      image,
      status
    };

    // Only include location if provided
    if (location && Array.isArray(location.coordinates)) {
      updateFields['location.type'] = location.type;
      updateFields['location.coordinates'] = location.coordinates;
    }

    const updated = await Doctor.findByIdAndUpdate(
      req.user.doctorId,
      updateFields, // dot-notation for nested fields
      { new: true, runValidators: true, select: '-password' }
    );

    if (!updated) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Profile updated', doctor: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select('-password');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export const searchDoctors = async (req, res) => {
  try {
    const { specialty, city, lat, lng, maxDistance } = req.query;
    
    let query = {};
    
    // Filter by specialty if provided and not 'All'
    if (specialty && specialty !== 'All') {
      query.specialty = specialty;
    }
    
    // Filter by city if provided
    if (city) {
      query.clinicAddress = { $regex: city, $options: 'i' }; // Case-insensitive search
    }
    
    // Geospatial search if coordinates provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxDistance ? parseInt(maxDistance) : 50000 // Default 50km
        }
      };
      
      const doctors = await Doctor.find(query).select('-password');
      return res.json(doctors);
    }
    
    // Regular search without geolocation
    const doctors = await Doctor.find(query).select('-password');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
