# Fitness AI Coach (MCP Server)

A secure, production-ready [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server built with Next.js that connects **Garmin Connect** and **Hevy** directly to ChatGPT or any other MCP-compatible LLM.

By connecting this server to ChatGPT, you instantly give it the ability to act as your personalized, data-driven AI Personal Trainer. It can read your run splits, analyze your sleep and recovery, dive into your 1-rep max progression, and compare your planned workouts against your actual performance.

---

## 🚀 Features

### Garmin Connect Integration
- **`get_recent_activities`**: Fetch your latest runs, rides, walks, or hikes with distance, duration, pace, and heart rate.
- **`get_activity_detail`**: Deep dive into a specific activity, including per-lap splits and elevation data.
- **`get_planned_workout`**: Read your Garmin Coach planned intervals and target paces for today (or any date).
- **`get_planned_vs_actual`**: Compare what your Garmin Coach *told* you to do vs. what you *actually* did.
- **`get_week_summary`**: Summarize a full Monday-Sunday week of training load.
- **`get_daily_recovery`**: Read your sleep stages, HRV, body battery, and resting heart rate to determine training readiness.
- **`get_weight_trend`**: Check recent body weight weigh-ins securely.

### Hevy (Strength Training) Integration
- **`get_lifting_sessions`**: Pull recent or historical (via date range) strength training logs. Includes sets, reps, weight, RPE, and set types (warmup, dropset, failure).
- **`get_exercise_progress`**: Chart your progress on a specific exercise (like Squats or Bench Press) over a date range.
- **`get_exercise_templates`**: Search the Hevy database by name or muscle group to find the specific template ID needed for tracking exercise progress.
- **`get_lifting_routines`**: Read your saved Hevy workout routines and programs.
- **`get_lifting_volume`**: Calculate total workout volume per exercise to track progressive overload.

### Security
- **Capability URL Auth**: Integrates natively with ChatGPT's UI without needing a complex OAuth setup. The MCP server uses a highly secure `?token=YOUR_SECRET_KEY` query parameter that acts as a password, fully encrypted over HTTPS.

---

## 🤖 Example ChatGPT Prompts

Once connected, you can ask ChatGPT things like:

> *"Check my sleep and HRV from last night. Based on my recovery, what kind of run should I do today? Check if Garmin Coach has anything planned for me."*

> *"I'm going to the gym for leg day. Can you pull up my recent Hevy lifting sessions and tell me what weights I should target for Squats today to ensure progressive overload?"*

> *"Pull my Garmin week summary and my Hevy lifting volume for the past 7 days. Am I overtraining?"*

> *"Compare my Garmin Coach planned interval run from yesterday to the actual activity detail. Did I hit my target paces on the sprints?"*

---

## 🛠 Deployment Guide (Vercel)

This project is designed to be deployed instantly to Vercel. 

### Prerequisites
1. A [Garmin Connect](https://connect.garmin.com/) account.
2. A [Hevy](https://hevy.com/) account and an API Key (get one at [hevy.com/settings?developer](https://hevy.com/settings?developer)).
3. A GitHub account.
4. A [Vercel](https://vercel.com/) account.

### Step 1: Clone & Push
Clone this repository and push it to your own personal GitHub account.

### Step 2: Deploy to Vercel
1. Log into Vercel and click **Add New... > Project**.
2. Select your new GitHub repository.
3. Before clicking Deploy, expand the **Environment Variables** section and add the following:
   - `GARMIN_EMAIL`: Your Garmin login email.
   - `GARMIN_PASSWORD`: Your Garmin password.
   - `HEVY_API_KEY`: Your Hevy API key.
   - `MCP_AUTH_TOKEN`: Create a long, secure, random string (e.g., a 32-character password). This will secure your server.
4. Click **Deploy**. Vercel will build and host your server.

### Step 3: Add Vercel Blob (Crucial for Garmin)
Garmin requires a session token to avoid blocking you for logging in too often. We use Vercel Blob to store this session securely.
1. In your Vercel Dashboard for the project, go to the **Storage** tab.
2. Click **Create Database** and select **Vercel Blob**.
3. Follow the prompts to attach it to your deployed project. Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` to your environment variables.
4. Go to the **Deployments** tab and click **Redeploy** on your latest build so it picks up the new Blob token.

---

## 🔌 Connecting to ChatGPT

1. Open ChatGPT and go to **Settings > Connected Apps > Workspace (or Custom Builder)**.
2. Click **Add new MCP Server**.
3. Fill in the details:
   - **Name**: Fitness Coach (or whatever you prefer)
   - **Authentication**: `None`
   - **URL**: `https://YOUR_VERCEL_APP_URL.vercel.app/api/mcp?token=YOUR_MCP_AUTH_TOKEN`

*(Make sure you replace `YOUR_VERCEL_APP_URL` with your actual Vercel domain, and `YOUR_MCP_AUTH_TOKEN` with the secret string you generated in Step 2).*

Click **Connect**, and ChatGPT will now instantly have access to your full fitness ecosystem!

---

## Local Development

If you want to run this locally to add new tools or test things out:

```bash
pnpm install

# Copy the env example and fill it out
cp .env.example .env.local

pnpm run dev
```

You can test that your tools are working using curl:
```bash
curl -s -X POST "http://localhost:3000/api/mcp?token=YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
