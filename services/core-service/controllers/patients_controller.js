const Readings = require("../models/readings-model");
const Patients = require("../models/patients-model");
const Staff = require("../models/staff-model");
const Login = require("../models/login-model");
const bcrypt = require("bcryptjs");

/**
 * Chat Service internal API base URL
 * Used for cross-service conversation management (keeps databases separated)
 */
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://chat-service:4004";

/**
 * Get all patients
 */
const getAllPatients = async (req, res) => {
  try {
    const patients = await Patients.find();
    res.json({ status: "success", data: { patients: patients } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Get patient by ID
 */
const getPatientById = async (req, res) => {
  try {
    const patient = await Patients.findOne({ patient_id: req.params.id });
    if (!patient) {
      return res.status(404).json({ status: "fail", data: null });
    }
    res.json({ status: "success", data: { patient: patient } });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
};

/**
 * Add new patient
 * Creates patient, login, and doctor-patient conversation (via chat-service)
 */
const addNewPatient = async (req, res) => {
  try {
    let doctor = await Staff.findOne({ staff_id: req.body.doctor_id });
    if (!doctor) {
      return res.status(400).json({ status: "failed", message: "the doctor id not registered" });
    }
    
    let new_patient = await new Patients(req.body);
    let password = new_patient.email.split("@")[0];
    let hashed_password = await bcrypt.hash(password, 6);
    
    let new_login = await new Login({
      user_id: new_patient.patient_id,
      email: new_patient.email,
      password: hashed_password,
      role: "patient",
    });

    await new_patient.save();
    await new_login.save();

    // Cross-service call: create doctor-patient conversation in chat-service
    try {
      await fetch(`${CHAT_SERVICE_URL}/internal/conversations/doc-pat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: `conv_${new_patient.patient_id}`,
          doctor_id: new_patient.doctor_id,
          patient_id: new_patient.patient_id,
          patient_name: new_patient.name,
        }),
      });
    } catch (chatErr) {
      console.error("⚠️ Failed to create conversation in chat-service:", chatErr.message);
    }

    res.status(201).json({ status: "success", data: { patient: new_patient } });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
};

/**
 * Delete patient by ID
 * Removes patient, login, readings, and conversation+messages (via chat-service)
 */
const deletePatientById = async (req, res) => {
  try {
    let patient = await Patients.findOne({ patient_id: req.params.id });
    await Patients.deleteOne({ patient_id: req.params.id });
    await Login.deleteOne({ user_id: req.params.id });
    await Readings.deleteMany({ device_id: patient.device_id });

    // Cross-service call: delete conversation and messages in chat-service
    try {
      await fetch(
        `${CHAT_SERVICE_URL}/internal/conversations/doc-pat/conv_${patient.patient_id}`,
        { method: "DELETE" }
      );
    } catch (chatErr) {
      console.error("⚠️ Failed to delete conversation in chat-service:", chatErr.message);
    }

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * Update patient by ID
 * Also updates login and conversation (via chat-service)
 */
const updatePatient = async (req, res) => {
  const id = req.params.id;
  const newId = req.body.patient_id;

  try {
    // 1) Update Patient
    const editedPatient = await Patients.findOneAndUpdate(
      { patient_id: id },
      { $set: req.body },
      { new: true }
    );

    if (!editedPatient) {
      return res.status(404).json({ status: "fail", data: null });
    }

    const loginFields = {};

    // update user_id
    if (newId) loginFields.user_id = newId;

    // update email if exists in req
    if (req.body.email) {
      loginFields.email = req.body.email;
      let password = req.body.email.split("@")[0];
      let hashed_password = await bcrypt.hash(password, 6);
      loginFields.password = hashed_password;
    }
    
    // 2) Update Login
    await Login.findOneAndUpdate(
      { user_id: id },
      { $set: loginFields },
      { new: true }
    );

    // 3) Cross-service call: update conversation in chat-service
    let new_conv_content = {};
    if (req.body.patient_id) new_conv_content.patient_id = req.body.patient_id;
    if (req.body.doctor_id) new_conv_content.doctor_id = req.body.doctor_id;
    if (req.body.name) new_conv_content.patient_name = req.body.name;
    if (req.body.patient_id) new_conv_content.conversation_id = `conv_${newId}`;

    try {
      await fetch(`${CHAT_SERVICE_URL}/internal/conversations/doc-pat/conv_${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(new_conv_content),
      });
    } catch (chatErr) {
      console.error("⚠️ Failed to update conversation in chat-service:", chatErr.message);
    }

    res.json({ status: "success", data: { user: editedPatient } });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  addNewPatient,
  deletePatientById,
  updatePatient,
};
