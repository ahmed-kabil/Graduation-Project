const Staff = require("./models/staff-model");
const Login = require("./models/login-model");
const Readings = require("./models/readings-model");
const Patients = require("./models/patients-model");
const {
  DocPatConversation,
  DocNurConversation
} = require("./models/conversations-model");
const Messages = require("./models/messages-model");

let cache = {
    patients_total: 0,
    patients_male: 0,
    patients_female: 0,
    doctors: 0,
    nurses: 0,
    receptionists: 0,
    users: 0,
    devices: 0,
    messages: 0,
    conversations: 0,
    readings: 0
};

async function updateCache() {
    try {
        cache.patients_male = await Patients.countDocuments({gender: "male"});
        cache.patients_female = await Patients.countDocuments({gender: "female"});
        cache.patients_total = cache.patients_male + cache.patients_female ;
        cache.doctors = await Staff.countDocuments({ role: "doctor" });
        cache.nurses = await Staff.countDocuments({ role: "nurse" });
        cache.receptionists = await Staff.countDocuments({ role: "receptionist" });

        cache.users = await Login.countDocuments();
        cache.devices = await Patients.countDocuments();

        cache.messages = await Messages.countDocuments();

        const docNurConvCount = await DocNurConversation.countDocuments();
        const docPatConvCount = await DocPatConversation.countDocuments();

        cache.conversations = docNurConvCount + docPatConvCount;

        cache.readings = await Readings.countDocuments();
    } catch (err) {
        console.error("Cache update error:", err);
    }
}

// run once immediately (VERY important)
updateCache();

// run every 5 seconds
setInterval(updateCache, 7000);

module.exports = cache;