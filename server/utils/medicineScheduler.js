/*
 * Sends "time for your medicine" push notifications. Checks once a minute (India time)
 * for active reminders due now and notifies each dose once. Runs inside the API server,
 * so a dose is only sent while the server is awake — the in-app list always shows the
 * full schedule regardless.
 */
const MedicineReminder = require("../models/MedicineReminder");
const { sendToUsers, isEnabled } = require("./push");
const { istNow } = require("./istTime");

const CHECK_MS = 60 * 1000;

async function sendDueReminders(now = istNow()) {
  if (!isEnabled()) return 0;
  const key = `${now.date} ${now.time}`;
  const due = await MedicineReminder.find({ active: true, times: now.time, lastNotified: { $ne: key } });
  let sent = 0;
  for (const item of due) {
    // Claim the dose first so two server instances never both send it.
    const claimed = await MedicineReminder.updateOne({ _id: item._id, lastNotified: { $ne: key } }, { lastNotified: key });
    if (!claimed.modifiedCount) continue;
    sent += await sendToUsers([item.userId], {
      title: `💊 Time for ${item.name}`,
      body: `${item.dose ? `${item.dose} · ` : ""}${now.time}. Tap to mark it as taken.`,
      url: "/medicines",
      tag: `med-${item._id}-${now.time}`,
      urgent: true,
    });
  }
  return sent;
}

function startMedicineScheduler() {
  const tick = () => sendDueReminders().catch((err) => console.error("Medicine reminders failed:", err.message));
  // Line up with the start of each minute.
  setTimeout(() => {
    tick();
    setInterval(tick, CHECK_MS);
  }, CHECK_MS - (Date.now() % CHECK_MS) + 1000);
}

module.exports = { startMedicineScheduler, sendDueReminders };
