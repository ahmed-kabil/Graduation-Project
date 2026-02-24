const Staff = require("../models/staff-model");
const Login = require("../models/login-model");
const bcrypt = require("bcryptjs");

/**
 * Chat Service internal API base URL
 * Used for cross-service conversation management (keeps databases separated)
 */
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://chat-service:4004";

/**
 * Get all staff members
 */
const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json({ status: "success", data: { staff: staff } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Add new staff member
 * - Validates duplicate staff_id before insert
 * - When adding a nurse: auto-creates DocNurConversation with all existing doctors (via chat-service)
 * - When adding a doctor: auto-creates DocNurConversation with all existing nurses (via chat-service)
 */
const addNewStaffMem = async (req, res) => {
  try {
    const { staff_id } = req.body;

    // Duplicate guard: check if staff_id already exists
    const existingStaff = await Staff.findOne({ staff_id });
    if (existingStaff) {
      return res.status(400).json({
        status: "error",
        message: "A staff member with this Staff ID already exists.",
      });
    }

    let new_staff = await new Staff(req.body);
    let password = new_staff.email.split("@")[0];
    let hashed_password = await bcrypt.hash(password, 6);

    let new_login = await new Login({
      user_id: new_staff.staff_id,
      email: new_staff.email,
      password: hashed_password,
      role: new_staff.role,
    });

    await new_staff.save();
    await new_login.save();

    // Auto-create doctor↔nurse conversations via chat-service
    try {
      if (new_staff.role === "nurse") {
        // New nurse → create conversations with all existing doctors
        const doctors = await Staff.find({ role: "doctor" });
        if (doctors.length > 0) {
          const conversations = doctors.map((doc) => ({
            conversation_id: `conv_${doc.staff_id}_${new_staff.staff_id}`,
            doctor_id: doc.staff_id,
            nurse_id: new_staff.staff_id,
            nurse_name: new_staff.name,
            doctor_name: doc.name,
          }));
          await fetch(`${CHAT_SERVICE_URL}/internal/conversations/doc-nur/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversations }),
          });
        }
      } else if (new_staff.role === "doctor") {
        // New doctor → create conversations with all existing nurses
        const nurses = await Staff.find({ role: "nurse" });
        if (nurses.length > 0) {
          const conversations = nurses.map((nur) => ({
            conversation_id: `conv_${new_staff.staff_id}_${nur.staff_id}`,
            doctor_id: new_staff.staff_id,
            nurse_id: nur.staff_id,
            nurse_name: nur.name,
            doctor_name: new_staff.name,
          }));
          await fetch(`${CHAT_SERVICE_URL}/internal/conversations/doc-nur/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversations }),
          });
        }
      }
    } catch (chatErr) {
      console.error("⚠️ Failed to create doc-nur conversations in chat-service:", chatErr.message);
    }

    return res.status(201).json({ status: "success", data: { staffMem: new_staff } });
  } catch (err) {
    // Handle duplicate key error with user-friendly message
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        status: "error",
        message: `A staff member with this ${field === 'staff_id' ? 'Staff ID' : field} already exists. Please use a different value.`,
      });
    }
    res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
};

/**
 * Get all doctors
 */
const getDoctors = async (req, res) => {
  try {
    const Doctors = await Staff.find({ role: "doctor" });
    res.json({ status: "success", data: { Doctors: Doctors } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get all nurses
 */
const getNurses = async (req, res) => {
  try {
    const nurses = await Staff.find({ role: "nurse" });
    res.json({ status: "success", data: { nurses: nurses } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get all receptionists
 */
const getReceptionists = async (req, res) => {
  try {
    const receptionists = await Staff.find({ role: "receptionist" });
    res.json({ status: "success", data: { receptionists: receptionists } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get staff member by ID
 */
const getStaffById = async (req, res) => {
  try {
    const staffMem = await Staff.findOne({ staff_id: req.params.id });

    if (!staffMem) {
      return res.status(404).json({ status: "fail", data: null });
    }
    res.json({ status: "success", data: { staffMem: staffMem } });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
};

/**
 * Delete staff member by ID
 * - Cascade deletes all doctor↔nurse conversations (via chat-service)
 */
const deleteStaffById = async (req, res) => {
  try {
    const staffMem = await Staff.findOne({ staff_id: req.params.id });

    await Staff.deleteOne({ staff_id: req.params.id });
    await Login.deleteOne({ user_id: req.params.id });

    // Cascade delete doctor↔nurse conversations via chat-service
    if (staffMem) {
      try {
        if (staffMem.role === "nurse") {
          await fetch(
            `${CHAT_SERVICE_URL}/internal/conversations/doc-nur/by-nurse/${staffMem.staff_id}`,
            { method: "DELETE" }
          );
        } else if (staffMem.role === "doctor") {
          await fetch(
            `${CHAT_SERVICE_URL}/internal/conversations/doc-nur/by-doctor/${staffMem.staff_id}`,
            { method: "DELETE" }
          );
        }
      } catch (chatErr) {
        console.error("⚠️ Failed to delete doc-nur conversations in chat-service:", chatErr.message);
      }
    }

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Update staff member by ID
 */
const updateStaffById = async (req, res) => {
  let id = req.params.id;
  try {
    const editedStaff = await Staff.findOneAndUpdate(
      { staff_id: id },
      { $set: req.body },
      { new: true }
    );
    await Login.findOneAndUpdate(
      { user_id: id },
      { $set: req.body },
      { new: true }
    );
    if (!editedStaff) {
      return res.status(404).json({ status: "fail", data: null });
    }
    res.json({ status: "success", data: { user: editedStaff } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

module.exports = {
  getAllStaff,
  addNewStaffMem,
  getDoctors,
  getNurses,
  getReceptionists,
  getStaffById,
  deleteStaffById,
  updateStaffById,
};
