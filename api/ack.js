const { redis, currentTask } = require('./_lib');

// Called whenever you open or return to the site. Stops reminders for the current task.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const t = currentTask();
  if (t) await redis.set(`ack:${t.key}`, 1, { ex: 86400 });
  res.json({ ok: true, task: t ? t.title : null });
};
