const client = require("prom-client");

// Patients
const patients_num = new client.Gauge({
    name: "patients_number",
    help: "Number of patients in the hospital"
});

const patients_male_num = new client.Gauge({
    name: "patients_male_number",
    help: "Number of male patients in the hospital"
});

const patients_female_num = new client.Gauge({
    name: "patients_female_number",
    help: "Number of female patients in the hospital"
});

// Doctors
const doctors_num = new client.Gauge({
    name: "doctors_number",
    help: "Number of doctors in the hospital"
});

// Nurses
const nurses_num = new client.Gauge({
    name: "nurses_number",
    help: "Number of nurses in the hospital"
});

// Receptionists
const receptionists_num = new client.Gauge({
    name: "receptionists_number",
    help: "Number of receptionists in the hospital"
});

// Users in system
const users_num = new client.Gauge({
    name: "users_number",
    help: "Number of users in the system"
});

// Devices
const devices_num = new client.Gauge({
    name: "devices_number",
    help: "Number of devices in the system"
});

// Messages
const messages_num = new client.Gauge({
    name: "messages_number",
    help: "Number of messages in the system"
});

// Conversations
const conversations_num = new client.Gauge({
    name: "conversations_number",
    help: "Number of conversations in the system"
});

// Readings
const readings_num = new client.Gauge({
    name: "readings_number",
    help: "Number of medical readings in the system"
});

module.exports = {
    patients_num,
    patients_male_num,
    patients_female_num,
    doctors_num,
    nurses_num,
    receptionists_num,
    users_num,
    devices_num,
    messages_num,
    conversations_num,
    readings_num
};