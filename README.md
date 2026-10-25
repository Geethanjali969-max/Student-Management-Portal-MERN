# Student Management Portal (MERN)

A responsive student management application built with React + Vite, Express, MongoDB/Mongoose, JWT authentication, bcrypt password hashing, and admin/student roles.

## Features
- Admin setup (one-time, protected by a setup secret)
- Login and student self-registration linked to an existing student record
- JWT-protected API
- Admin-only create/update/delete student records
- Admin dashboard with counts, search, department filter, CRUD
- Student dashboard restricted to the logged-in student's own profile
- Student list persists in MongoDB

## Requirements
- Node.js 18+
- MongoDB Community Server running locally, or a MongoDB connection string

## Setup

### 1. Backend
Open a terminal in `server`:

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Generate two different secrets and set them as `JWT_SECRET` and `ADMIN_SETUP_SECRET` in `server/.env`.
Set `MONGO_URI` if needed.

Start the backend:

```powershell
npm run dev
```

API health check: http://localhost:5000/api/health

### 2. Frontend
Open another terminal in `client`:

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite (normally http://localhost:5173).

### 3. Create the first admin
Use PowerShell after the backend starts. Replace the values and paste the `ADMIN_SETUP_SECRET` value when prompted. Do not share the secret.

```powershell
$setupSecret = Read-Host "ADMIN_SETUP_SECRET from server/.env"
$body = @{
  name = "Portal Admin"
  email = "admin@example.com"
  password = "Use-A-Strong-Password-Here"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5000/api/auth/setup-admin" `
  -Method POST `
  -Headers @{ "x-admin-setup-secret" = $setupSecret } `
  -ContentType "application/json" `
  -Body $body
Remove-Variable setupSecret
```

The admin setup endpoint automatically refuses further setup once an admin exists. For production, also remove/disable the endpoint in code after initial setup.

### 4. Add students
Log in as admin and add student records with unique student ID and email. A student can then register using that exact student ID and email.

## Security notes
- Never commit `.env` or real secrets.
- Use HTTPS and a managed database for deployment.
- Configure rate limiting and stricter operational controls before production use.
- This is a portfolio/college project starter, not a security-audited production system.
