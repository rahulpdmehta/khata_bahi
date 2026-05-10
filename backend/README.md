# Pollution Center Management Backend

Backend API for the Pollution Center Management System.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

5. **Seed the database:**
   ```bash
   npm run prisma:seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

The server will start on http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/change-password` - Change password
- `GET /api/v1/auth/me` - Get current user profile

## Default Credentials

After seeding:
- **Admin**: username: `admin`, password: `admin123`
- **Staff1**: username: `staff1`, password: `staff123`
- **Staff2**: username: `staff2`, password: `staff123`
