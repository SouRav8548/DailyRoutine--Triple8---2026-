const { Redis } = require('@upstash/redis');
const routine = require('../public/routine.json');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Only these block types count as tasks that trigger reminders.
const TASK_TYPES = ['class', 'self', 'tuition'];

// Current day, date and minutes-since-midnight in India time.
function istNow(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map(x => [x.type, x.value])
  );
  return { day: p.weekday, date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour) * 60 + (+p.minute) };
}

// The task running right now, or null.
function currentTask(d) {
  const n = istNow(d);
  const r = (routine[n.day] || []).find(([a, b, t]) => n.minutes >= a && n.minutes < b && TASK_TYPES.includes(t));
  if (!r) return null;
  return { key: `${n.date}:${r[0]}`, start: r[0], end: r[1], type: r[2], title: r[3], note: r[4] || '', minutesIn: n.minutes - r[0] };
}

module.exports = { redis, currentTask, istNow };
