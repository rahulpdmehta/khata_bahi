# ⚡ Quick Start Guide (5 Minutes)

## Prerequisites Check
- [ ] Node.js 20+ installed: `node --version`
- [ ] MySQL 8.0+ installed: `mysql --version`

---

## 1️⃣ Setup MySQL Database (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE pollution_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pollution_admin'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pollution_center_db.* TO 'pollution_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2️⃣ Setup Backend (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Update .env with your MySQL password
# Edit the DATABASE_URL line if you changed the password

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
# When prompted, enter: init

# Seed database with test data
npm run prisma:seed

# Start backend server
npm run dev
```

✅ Backend running on http://localhost:3000

---

## 3️⃣ Setup Frontend (1 minute)

**Open a NEW terminal window:**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start frontend server
npm run dev
```

✅ Frontend running on http://localhost:5173

---

## 4️⃣ Login & Test

Open browser: **http://localhost:5173**

### Test Accounts:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Staff:**
- Username: `staff1`
- Password: `staff123`

---

## 🎉 Done!

You should now see the dashboard!

---

## Troubleshooting

**Backend fails to start?**
- Check MySQL is running: `mysql -u root -p`
- Verify password in `backend/.env`

**Frontend can't connect?**
- Ensure backend is running on port 3000
- Check browser console for errors

**Need more help?**
- See `SETUP_GUIDE.md` for detailed instructions
- Check `IMPLEMENTATION_STATUS.md` for project status

---

## Next Steps

1. Explore the dashboard
2. Review `PROJECT_PLAN.md` for next features
3. Check `BACKEND_SPEC.md` and `FRONTEND_SPEC.md` for technical details
4. Start implementing features!

---

**Happy Coding! 🚀**
