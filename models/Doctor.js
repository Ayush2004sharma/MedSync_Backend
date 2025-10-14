// models/Doctor.js
import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hash before save
  specialty: { type: String, required: true },
  qualifications: [String],
  bio: String,
  clinicAddress: String,
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0],
      validate: {
        validator: function(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] >= -180 && value[0] <= 180 &&
            value[1] >= -90  && value[1] <= 90
          );
        },
        message: props => `${props.value} is not a valid [lng, lat] coordinate pair`
      }
    }
  },
  phone: String,
  experience: Number,
  fee: Number,
  profilePic: String,
  ratings: { type: Number, default: 0 },
  reviews: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, rating: Number, comment: String }]
}, { timestamps: true });

// Geo-index for location-based search
doctorSchema.index({ location: "2dsphere" });

export const Doctor = mongoose.model('Doctor', doctorSchema);
