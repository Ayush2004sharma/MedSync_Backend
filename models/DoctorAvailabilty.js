// models/DoctorWeeklySchedule.js
import mongoose from 'mongoose';

const weeklyScheduleSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true },
  schedule: {
    mon: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    tue: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    wed: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    thu: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    fri: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    sat: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] },
    sun: { active: { type: Boolean, default: false }, slots: [{ startTime: String, endTime: String }] }
  }
}, { timestamps: true });

export const DoctorWeeklySchedule = mongoose.model('DoctorWeeklySchedule', weeklyScheduleSchema);
