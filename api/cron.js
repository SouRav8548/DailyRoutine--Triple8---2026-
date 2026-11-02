const webpush = require("web-push");
const { waitUntil } = require("@vercel/functions");
const { redis, currentTask, istNow } = require("./_lib");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendAll(payload) {
  const raw = (await redis.hgetall("subs")) || {};
  const results = await Promise.allSettled(
    Object.entries(raw).map(async ([id, v]) => {
      const sub = typeof v === "string" ? JSON.parse(v) : v;
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410)
          await redis.hdel("subs", id);
        throw err;
      }
    }),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

// One reminder round: sends a notification if a task is running and not yet acknowledged.
async function round() {
  const task = currentTask();
  if (!task) return { sent: 0, reason: "no task running now" };
  if (process.env.ONCE === "1" && task.minutesIn > 0)
    return { sent: 0, reason: "ONCE mode: only at task start" };
  if (await redis.get(`ack:${task.key}`))
    return { sent: 0, reason: "already acknowledged (site was opened)" };
  const delivered = await sendAll({
    title: task.minutesIn < 1 ? "Time to start" : "Reminder",
    body: `${task.title}${task.note ? " (" + task.note + ")" : ""}. Open the site to stop these reminders.`,
  });
  return { sent: delivered, task: task.title };
}

// Call this URL every minute (cron-job.org). It answers fast, then sends a second reminder 30 s later.
module.exports = async (req, res) => {
  const secret = (process.env.CRON_SECRET || "").trim();
  const given = (
    (req.headers.authorization || "").replace("Bearer ", "") ||
    req.query.key ||
    ""
  ).trim();
  if (!secret || given !== secret)
    return res.status(401).json({ error: "unauthorized" });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:example@example.com",
    (process.env.VAPID_PUBLIC_KEY || "").trim(),
    (process.env.VAPID_PRIVATE_KEY || "").trim(),
  );

  if (req.query.test) {
    const n = await sendAll({
      title: "Test reminder",
      body: "Notifications are working.",
    });
    return res.json({ test: true, delivered: n });
  }

  if (req.query.status) {
    const task = currentTask();
    const acked = task ? !!(await redis.get(`ack:${task.key}`)) : null;
    const subs = await redis.hlen("subs");
    return res.json({
      indiaTime: istNow(),
      runningTask: task ? task.title : null,
      acknowledged: acked,
      subscribedDevices: subs,
      onceMode: process.env.ONCE === "1",
    });
  }

  const first = await round();
  waitUntil(
    (async () => {
      await sleep(30000);
      await round();
    })(),
  );
  res.json({ ok: true, first });
};
