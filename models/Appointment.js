import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  scheduledFor: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["pending", "booked", "cancelled", "completed", "rejected"], 
    default: "pending"  // default changed to pending for new approval workflow
  },
  notes: String,
}, { timestamps: true });

// Prevent double-booking: one doctor cannot have two appointments at the same time in "booked" status
// To enforce that, consider adding a partial index filtering to booked status to allow multiple pending but only one booked
appointmentSchema.index(
  { doctor: 1, scheduledFor: 1 }, 
  { unique: true, partialFilterExpression: { status: "booked" } }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
