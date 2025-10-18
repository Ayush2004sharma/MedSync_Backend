import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Doctor from '../models/Doctor.js';

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

// Get doctor profile (authenticated)
export const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.doctorId).select('-password');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update doctor profile
export const updateDoctorProfile = async (req, res) => {
  try {
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
      location
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

    // Update location if provided
    if (location && location.coordinates && Array.isArray(location.coordinates)) {
      updateFields.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
    }

    const updated = await Doctor.findByIdAndUpdate(
      req.user.doctorId,
      updateFields,
      { new: true, runValidators: true, select: '-password' }
    );

    if (!updated) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Profile updated', doctor: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all doctors (basic - no location filter)
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select('-password');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: Search doctors by proximity (within 5km radius)
export const searchDoctorsByProximity = async (req, res) => {
  try {
    const { longitude, latitude, specialty, maxDistance = 5000 } = req.query; // maxDistance in meters (default 5km)

    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({ 
        message: 'Longitude and latitude are required for proximity search' 
      });
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: parseInt(maxDistance) // in meters
        }
      }
    };

    // Add specialty filter if provided
    if (specialty && specialty !== 'All') {
      query.specialty = specialty;
    }

    // Find doctors near the location
    const doctors = await Doctor.find(query).select('-password');

    // Calculate exact distance for each doctor
    const doctorsWithDistance = doctors.map(doctor => {
      const distance = calculateDistance(
        lat, lng,
        doctor.location.coordinates[1], doctor.location.coordinates[0]
      );

      return {
        ...doctor.toObject(),
        distance: parseFloat(distance.toFixed(2)) // distance in km
      };
    });

    res.json({
      count: doctorsWithDistance.length,
      doctors: doctorsWithDistance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: Advanced search with aggregation pipeline (includes distance calculation)
export const searchDoctorsAdvanced = async (req, res) => {
  try {
    const { longitude, latitude, specialty, maxDistance = 5000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ 
        message: 'Longitude and latitude are required' 
      });
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    // Build aggregation pipeline
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          distanceField: 'distance',
          maxDistance: parseInt(maxDistance), // meters
          spherical: true,
          distanceMultiplier: 0.001 // Convert to kilometers
        }
      }
    ];

    // Add specialty filter if needed
    if (specialty && specialty !== 'All') {
      pipeline.push({
        $match: { specialty: specialty }
      });
    }

    // Exclude password field
    pipeline.push({
      $project: { password: 0 }
    });

    const doctors = await Doctor.aggregate(pipeline);

    res.json({
      count: doctors.length,
      doctors: doctors.map(doc => ({
        ...doc,
        distance: parseFloat(doc.distance.toFixed(2))
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper function: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Get unique specialties
// Get unique specialties (simpler version)
export const getSpecialties = async (req, res) => {
  try {
    // Get all doctors
    const doctors = await Doctor.find({}, 'specialty');
    
    // Extract unique specialties
    const specialtiesSet = new Set();
    doctors.forEach(doc => {
      if (doc.specialty && doc.specialty.trim() !== '') {
        specialtiesSet.add(doc.specialty.trim());
      }
    });
    
    // Convert to sorted array
    const specialties = Array.from(specialtiesSet).sort();
    
    console.log('📋 Available specialties:', specialties);
    res.json(specialties);
  } catch (err) {
    console.error('❌ Error fetching specialties:', err);
    res.status(500).json({ message: err.message });
  }
};

