import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  scheduledFor: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["pending", "booked", "cancelled", "completed", "rejected"], 
    default: "pending"
  },
  notes: String,
}, { timestamps: true });

// Prevent double-booking
appointmentSchema.index(
  { doctor: 1, scheduledFor: 1 }, 
  { unique: true, partialFilterExpression: { status: "booked" } }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
