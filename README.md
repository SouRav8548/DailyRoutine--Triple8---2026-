# 8:8:8 Routine with task reminders

A static site (`public/`) plus four small serverless functions (`api/`).
When a class, tuition or self-study block starts, you get a notification every 30 seconds until you open the site.

## Setup (all free)

### 1. Put the code on GitHub
Create a new repository and upload everything in this folder (keep the `api` and `public` folders as they are).

### 2. Make push keys (once)
On your computer, with Node installed:

    npx web-push generate-vapid-keys

Keep the Public Key and Private Key. Do not share the private key or commit it to GitHub.

### 3. Make a free Redis database
Vercel project, Storage tab, Create, choose Upstash (Redis), free plan, then Connect it to your project.
This adds the database environment variables for you.

### 4. Deploy on Vercel
Vercel dashboard, Add New, Project, import your GitHub repo, then add these Environment Variables:

| Name | Value |
|---|---|
| VAPID_PUBLIC_KEY | the Public Key from step 2 |
| VAPID_PRIVATE_KEY | the Private Key from step 2 |
| VAPID_SUBJECT | mailto:your-email@example.com |
| CRON_SECRET | any long random text you choose |

Deploy. (If you added the database after deploying, redeploy once.)

### 5. Make it run every minute
Vercel's free plan only allows a cron job once a day, so use a free scheduler:

1. Sign up at https://cron-job.org
2. Create a cron job with this URL:
   `https://YOUR-SITE.vercel.app/api/cron?key=YOUR_CRON_SECRET`
3. Schedule: every 1 minute.

Each call sends one reminder immediately and a second one 30 seconds later.

### 6. Turn on reminders on your phone or laptop
1. Open your site and tap "Turn on reminders", then Allow.
2. Check it works: open `https://YOUR-SITE.vercel.app/api/cron?key=YOUR_CRON_SECRET&test=1` in another tab. A test notification should arrive.

**iPhone:** push only works after you tap Share, Add to Home Screen, and open the site from the home screen icon (iOS 16.4 or later).
**Android and laptop:** works in Chrome or Edge directly. Allow notifications for the site.

## How it works
- Tasks are the class, tuition and self-study blocks in `public/routine.json`. Free time and sleep never send reminders.
- Opening or returning to the site tells the server you have seen the current task, which stops its reminders.
- Reminders also stop on their own when the task ends. Each new task starts fresh.
- Times use India time (Asia/Kolkata).

## Changing the routine
Edit `public/routine.json`. Each block is `[startMinute, endMinute, type, title, note]`, with minutes counted from midnight (6:00 PM = 1080). Types: class, self, tuition, free.
