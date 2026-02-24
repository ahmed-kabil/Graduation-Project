const Appointment = require("../models/appointment-model");

/**
 * Create a new appointment
 */
const createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, date, time, reason } = req.body;
    const appointment = new Appointment({
      patient_id,
      doctor_id,
      date,
      time,
      reason,
    });
    await appointment.save();
    res.status(201).json({ status: "success", data: { appointment } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get all appointments for a specific doctor
 */
const getDocAppointment = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor_id: req.params.doc_id });
    res.json({ status: "success", data: { appointments } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get all appointments for a specific patient
 */
const getPatAppointment = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient_id: req.params.pat_id });
    res.json({ status: "success", data: { appointments } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Mark an appointment as fulfilled
 */
const markAppointmentAsFulfilled = async (req, res) => {
  try {
    const { _id } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      _id,
      { status: "fulfilled" },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ status: "fail", message: "Appointment not found" });
    }
    res.json({ status: "success", data: { appointment } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Delete an appointment
 */
const deleteAppointment = async (req, res) => {
  try {
    const result = await Appointment.findByIdAndDelete(req.params.appo_id);
    if (!result) {
      return res.status(404).json({ status: "fail", message: "Appointment not found" });
    }
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

module.exports = {
  createAppointment,
  getDocAppointment,
  getPatAppointment,
  markAppointmentAsFulfilled,
  deleteAppointment,
};
