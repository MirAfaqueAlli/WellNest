# WellNest 🌿

> **A modern maternal care and child immunization tracking platform for hospitals.**

WellNest helps hospital staff manage the full care journey — from the first antenatal checkup through to a child's complete immunization schedule — with automated WhatsApp reminders at every step.

---

## ✨ Features

- 🤰 **Antenatal Care (ANC) Tracking** — Auto-generated pregnancy checkup stages (Booking → 16W → 25W → ... → Delivery) based on the patient's EDD/LMP
- 👶 **Child Immunization Schedule** — Auto-generated upon recording delivery (At Birth → 6 Weeks → 10 Weeks → ... → 2 Years+)
- 📱 **Automated WhatsApp Notifications** — Instant stage-complete alerts + daily cron reminders (7-day, 1-day, today, missed)
- 🏥 **Multi-Hospital API Config** — Each hospital can set its own WhatsApp API credentials directly from the settings panel
- 📊 **Dashboard** — Live stats for active patients, upcoming appointments, and missed stages
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile

---

## 🗂️ Project Structure

```
wellnest/
├── backend/          # Node.js + Express + Sequelize (MySQL)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/     # WhatsApp service, Cron job
│   ├── seeders/
│   └── server.js
└── frontend/         # React + Vite + Vanilla CSS
    └── src/
        ├── components/
        ├── pages/
        └── store/
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### Backend

```bash
cd backend
npm install
cp .env.example .env       # fill in your DB and WhatsApp API details
node seeders/adminUser.seed.js   # create first admin user
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`  
The API runs at `http://localhost:5000`

---

## 🔑 Environment Variables (Backend)

See [`backend/.env.example`](backend/.env.example) for all required variables.

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL host |
| `DB_NAME` | Database name |
| `DB_USER` | MySQL username |
| `DB_PASS` | MySQL password |
| `JWT_SECRET` | Secret key for JWT tokens |
| `WHATSAPP_API_URL` | Your WhatsApp API endpoint (fallback) |
| `WHATSAPP_API_KEY` | Your WhatsApp API key (fallback) |
| `CLIENT_URL` | Frontend URL (for CORS) |

> **Note:** WhatsApp credentials can also be configured per-hospital directly in the app's Hospital Settings page.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | Node.js, Express |
| Database | MySQL + Sequelize ORM |
| Auth | JWT (JSON Web Tokens) |
| Notifications | WhatsApp API (custom provider) |
| Scheduling | node-cron |

---
