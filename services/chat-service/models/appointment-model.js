const mongoose = require("mongoose");

const appointmentsSchema = new mongoose.Schema({
  patient_id: { type: String, required: true },
  doctor_id: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["booked", "fulfilled"], default: "booked" },
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentsSchema);