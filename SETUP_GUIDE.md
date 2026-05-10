# 🚀 Complete Setup Guide

## Prerequisites

Before starting, ensure you have:
- **Node.js** 20+ LTS installed ([Download](https://nodejs.org/))
- **MySQL** 8.0+ installed and running
- **npm** (comes with Node.js)
- A terminal/command line interface

---

## Step 1: MySQL Database Setup

### Install MySQL (if not already installed)

**macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Download and install from [MySQL Downloads](https://dev.mysql.com/downloads/installer/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### Secure MySQL Installation

```bash
mysql_secure_installation
```

Follow the prompts:
- Set root password (remember this!)
- Remove anonymous users: Yes
- Disallow root login remotely: Yes
- Remove test database: Yes
- Reload privilege tables: Yes

### Create Database and User

```bash
mysql -u root -p
```

Enter your root password, then run:

```sql
CREATE DATABASE pollution_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pollution_admin'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pollution_center_db.* TO 'pollution_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Important:** Change `'secure_password'` to a strong password and remember it!

---

## Step 2: Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

### Install Dependencies

```bash
npm install
```

This will install all required packages. It may take a few minutes.

### Configure Environment Variables

The `.env` file should already exist with default values. If not, copy from example:

```bash
cp .env.example .env
```

Edit `.env` and update the database password:

```env
DATABASE_URL="mysql://pollution_admin:YOUR_PASSWORD_HERE@localhost:3306/pollution_center_db"
```

Replace `YOUR_PASSWORD_HERE` with the password you set for `pollution_admin`.

### Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma client based on your schema.

### Run Database Migrations

```bash
npm run prisma:migrate
```

When prompted for a migration name, enter: `init`

This creates all database tables.

### Seed the Database

```bash
npm run prisma:seed
```

This populates the database with:
- Admin user (username: `admin`, password: `admin123`)
- 2 Staff users (username: `staff1`/`staff2`, password: `staff123`)
- 3 Pollution centers
- Income sources (PUC fee, road tax, etc.)
- Vehicle types (2-wheeler, 4-wheeler, etc.)
- Sample transactions

### Start Backend Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Server running on port 3000
📝 Environment: development
🔗 API URL: http://localhost:3000/api/v1
💚 Health check: http://localhost:3000/health
```

**Keep this terminal window open!**

---

## Step 3: Frontend Setup

Open a **NEW terminal window** and navigate to the frontend folder:

```bash
cd frontend
```

### Install Dependencies

```bash
npm install
```

This will install React, Material-UI, Redux, and all other frontend dependencies.

### Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Step 4: Access the Application

Open your browser and go to:

**http://localhost:5173**

### Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Staff Account:**
- Username: `staff1`
- Password: `staff123`

---

## Verify Installation

### Backend Health Check

Visit: http://localhost:3000/health

You should see:
```json
{
  "status": "OK",
  "timestamp": "2026-04-03T...",
  "environment": "development"
}
```

### Database GUI (Optional)

To view and manage your database with a GUI:

```bash
cd backend
npm run prisma:studio
```

This opens Prisma Studio at: http://localhost:5555

---

## Troubleshooting

### Backend won't start

**Error: `Can't reach database server`**
- Check if MySQL is running: `mysql -u root -p`
- Verify database credentials in `backend/.env`
- Ensure database `pollution_center_db` exists

**Error: `Port 3000 already in use`**
- Another process is using port 3000
- Kill the process or change the port in `backend/.env`

### Frontend won't start

**Error: `Port 5173 already in use`**
- Close other Vite/frontend servers
- Or change the port in `frontend/vite.config.ts`

**Error: `Cannot connect to backend`**
- Ensure backend is running on port 3000
- Check `frontend/.env` has correct API URL

### Login doesn't work

**Invalid credentials**
- Ensure database was seeded: `cd backend && npm run prisma:seed`
- Try default credentials: `admin` / `admin123`

**Network error**
- Backend must be running
- Check browser console for errors
- Verify CORS settings in `backend/.env`

---

## Development Workflow

### Daily Development

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Make changes** - Both servers will auto-reload on file changes

### View Database

```bash
cd backend
npm run prisma:studio
```

### Reset Database

To start fresh:

```bash
cd backend
npm run prisma:migrate reset
npm run prisma:seed
```

---

## Next Steps

Now that your development environment is set up:

1. ✅ Login with admin or staff account
2. ✅ Explore the dashboard
3. 📝 Start implementing features per the PROJECT_PLAN.md

---

## Useful Commands

### Backend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Check code quality
npm run prisma:studio # Open database GUI
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Check code quality
npm run type-check   # Check TypeScript types
```

---

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review `backend/README.md` and `frontend/README.md`
3. Check the error messages carefully
4. Ensure all prerequisites are installed

---

**🎉 Congratulations! Your development environment is ready!**
