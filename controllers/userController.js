import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {User} from '../models/User.js';

// Register User
export const  registerUser = async (req, res) => {
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

// controllers/userController.js
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// controllers/userController.js
export const updateUserProfile = async (req, res) => {
  try {
    // Filter only updatable fields
    const { name, dob, gender, phone, address, image } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { name, dob, gender, phone, address, image },
      { new: true, runValidators: true, select: '-password' }
    );
    if (!updated){ 
      console.error("User not found for update");
      return res.status(404).json({ message: 'User not found' });}
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
   
    res.status(500).json({ message: err.message });
  }
};
