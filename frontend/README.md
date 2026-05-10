# Pollution Center Management Frontend

React frontend application for the Pollution Center Management System.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

The application will start on http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm test` - Run tests

## Project Structure

```
src/
├── app/              # Redux store configuration
├── features/         # Feature-based modules
│   ├── auth/        # Authentication
│   ├── dashboard/   # Dashboard
│   └── transactions/ # Transaction management
├── components/       # Reusable components
│   ├── layout/      # Layout components
│   ├── common/      # Common UI components
│   └── protected/   # Protected route components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── routes/          # Route configuration
├── types/           # TypeScript types
└── theme/           # MUI theme configuration
```

## Login Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Staff**: username: `staff1`, password: `staff123`

## Tech Stack

- React 18
- TypeScript
- Redux Toolkit
- Material-UI (MUI)
- React Router v6
- Axios
- Vite
