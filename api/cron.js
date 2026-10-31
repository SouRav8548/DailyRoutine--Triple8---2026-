const webpush = require('web-push');
const { redis, currentTask } = require('./_lib');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sendAll(payload) {
  const raw = (await redis.hgetall('subs')) || {};
  const results = await Promise.allSettled(Object.entries(raw).map(async ([id, v]) => {
    const sub = typeof v === 'string' ? JSON.parse(v) : v;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await redis.hdel('subs', id);
      throw err;
    }
  }));
  return results.filter(r => r.status === 'fulfilled').length;
}

// Call this URL every minute (cron-job.org). Each call sends at :00 and again at :30.
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.authorization || '').replace('Bearer ', '') || req.query.key;
  if (!secret || given !== secret) return res.status(401).json({ error: 'unauthorized' });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:example@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  if (req.query.test) {
    const n = await sendAll({ title: 'Test reminder', body: 'Notifications are working.' });
    return res.json({ test: true, delivered: n });
  }

  let delivered = 0, rounds = 0;
  for (let round = 0; round < 2; round++) {
    const task = currentTask();
    if (!task) break;
    if (process.env.ONCE === '1' && task.minutesIn > 0) break; // ONCE=1: one notification at task start only
    if (await redis.get(`ack:${task.key}`)) break;
    delivered += await sendAll({
      title: task.minutesIn < 1 ? 'Time to start' : 'Reminder',
      body: `${task.title}${task.note ? ' (' + task.note + ')' : ''}. Open the site to stop these reminders.`,
    });
    rounds++;
    if (round === 0) await sleep(30000);
  }
  res.json({ ok: true, rounds, delivered });
};
