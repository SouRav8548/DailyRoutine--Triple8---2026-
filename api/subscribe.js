const crypto = require('crypto');
const { redis } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'bad subscription' });
  const id = crypto.createHash('sha1').update(sub.endpoint).digest('hex');
  await redis.hset('subs', { [id]: JSON.stringify(sub) });
  res.json({ ok: true });
};
