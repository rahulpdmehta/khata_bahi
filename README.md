# Pollution Center Management System

A comprehensive financial tracking system for pollution testing centers with admin oversight, daily settlements, and analytics.

## Project Structure

```
expense_app/
├── backend/          # Node.js + Express + TypeScript + Prisma
├── frontend/         # React + TypeScript + Redux Toolkit
├── docs/            # Additional documentation
├── BACKEND_SPEC.md  # Backend technical specification
├── FRONTEND_SPEC.md # Frontend technical specification
└── PROJECT_PLAN.md  # Complete implementation plan
```

## Prerequisites

- Node.js 20+ LTS
- MySQL 8.0+
- npm or yarn

## Quick Start

### 1. Install MySQL

**macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Create Database:**
```bash
mysql -u root -p
CREATE DATABASE pollution_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pollution_admin'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pollution_center_db.* TO 'pollution_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Backend will run on: http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend will run on: http://localhost:5173

## Default Login Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Staff:**
- Username: `staff1`
- Password: `staff123`

## Tech Stack

### Frontend
- React 18 + TypeScript
- Redux Toolkit + RTK Query
- Material-UI (MUI)
- React Router v6
- Vite

### Backend
- Node.js 20 + Express
- TypeScript
- Prisma ORM
- MySQL 8.0+
- JWT Authentication

## Features

### For Staff Users
- Transaction entry with vehicle details
- View today's entries
- Request transaction edits
- Daily settlement submission
- Settlement history

### For Admin Users
- Complete analytics dashboard
- Transaction management (full CRUD)
- Edit request approval/rejection
- Settlement approval
- User management
- Center management
- System configuration
- Advanced reporting with filters
- Export to PDF/Excel

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:3000/api-docs

## Database Management

**Prisma Studio:**
```bash
cd backend
npx prisma studio
```

Access at: http://localhost:5555

## Development Commands

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Project Status

- [x] Project planning and architecture
- [x] Technical specifications
- [ ] Backend implementation
- [ ] Frontend implementation
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

## Support

For issues and questions, please refer to the documentation files:
- `PROJECT_PLAN.md` - Complete implementation plan
- `BACKEND_SPEC.md` - Backend technical details
- `FRONTEND_SPEC.md` - Frontend technical details

## License

Private - All rights reserved
# khata_bahi
