
const client = require("prom-client");
const {patients_num,patients_male_num,patients_female_num, doctors_num, nurses_num, receptionists_num, users_num, devices_num, messages_num, conversations_num, readings_num} = require("../metrics")

const cache = require("../metrics_updater")



// update metrics from cache
function syncMetrics() {
    // console.log(cache)
    patients_num.set(cache.patients_total);
    patients_male_num.set(cache.patients_male);
    patients_female_num.set(cache.patients_female);
    doctors_num.set(cache.doctors);
    nurses_num.set(cache.nurses);
    receptionists_num.set(cache.receptionists);
    users_num.set(cache.users);
    devices_num.set(cache.devices);
    messages_num.set(cache.messages);
    conversations_num.set(cache.conversations);
    readings_num.set(cache.readings);
}



const getMetrics = async (req, res) => {

    syncMetrics();

    res.set("Content-Type", client.register.contentType);

    const metrics = await client.register.metrics();

    res.end(metrics);
};

module.exports = { getMetrics };

// exports.getMetrics = getMetrics;
