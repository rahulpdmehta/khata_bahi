# Backend Technical Specification

## Technology Stack

### Core
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.0+

### Database
- **Primary Database**: MySQL 8.0+ (Local installation)
- **ORM**: Prisma 5.0+
- **Migrations**: Prisma Migrate

### Caching
- **Cache**: None initially (can add later if needed)

### Authentication & Security
- **JWT**: jsonwebtoken
- **Password Hashing**: bcrypt
- **Rate Limiting**: express-rate-limit
- **CORS**: cors
- **Helmet**: helmet (security headers)
- **Input Sanitization**: express-validator

### Validation
- **Schema Validation**: Zod 3.22+

### Documentation
- **API Docs**: Swagger/OpenAPI 3.0
- **Tools**: swagger-ui-express, swagger-jsdoc

### Logging & Monitoring
- **Logger**: Winston or Pino
- **Request Logging**: morgan
- **Metrics**: prom-client (Prometheus)

### Testing
- **Test Framework**: Jest 29+
- **API Testing**: Supertest
- **Coverage**: Istanbul/nyc

### Utilities
- **Date**: date-fns
- **Validation**: validator.js
- **File Processing**: xlsx (Excel), pdfkit (PDF)
- **Email**: nodemailer (optional)

### Development Tools
- **Hot Reload**: nodemon
- **Linting**: ESLint
- **Formatting**: Prettier
- **Debugging**: VS Code debugger

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── config/
│   │   ├── database.ts          # Prisma client initialization
│   │   ├── environment.ts       # Environment variables
│   │   └── swagger.ts           # Swagger configuration
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── roleGuard.ts         # Role-based access control
│   │   ├── errorHandler.ts     # Global error handler
│   │   ├── validation.ts        # Request validation
│   │   ├── rateLimiter.ts       # Rate limiting
│   │   ├── logger.ts            # Request logging
│   │   └── asyncHandler.ts      # Async wrapper
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.dto.ts
│   │   │   └── auth.test.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── transaction.repository.ts
│   │   │   ├── transaction.routes.ts
│   │   │   ├── transaction.dto.ts
│   │   │   ├── transaction.validation.ts
│   │   │   └── transaction.test.ts
│   │   │
│   │   ├── settlements/
│   │   │   ├── settlement.controller.ts
│   │   │   ├── settlement.service.ts
│   │   │   ├── settlement.repository.ts
│   │   │   ├── settlement.routes.ts
│   │   │   ├── settlement.dto.ts
│   │   │   └── settlement.test.ts
│   │   │
│   │   ├── editRequests/
│   │   │   ├── editRequest.controller.ts
│   │   │   ├── editRequest.service.ts
│   │   │   ├── editRequest.repository.ts
│   │   │   ├── editRequest.routes.ts
│   │   │   ├── editRequest.dto.ts
│   │   │   └── editRequest.test.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── dashboard.test.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── report.controller.ts
│   │   │   ├── report.service.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── generators/
│   │   │   │   ├── pdfGenerator.ts
│   │   │   │   └── excelGenerator.ts
│   │   │   └── report.test.ts
│   │   │
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.dto.ts
│   │   │   └── user.test.ts
│   │   │
│   │   ├── centers/
│   │   │   ├── center.controller.ts
│   │   │   ├── center.service.ts
│   │   │   ├── center.repository.ts
│   │   │   ├── center.routes.ts
│   │   │   ├── center.dto.ts
│   │   │   └── center.test.ts
│   │   │
│   │   └── masterData/
│   │       ├── masterData.controller.ts
│   │       ├── masterData.service.ts
│   │       ├── masterData.routes.ts
│   │       └── masterData.test.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts               # JWT utilities
│   │   ├── encryption.ts        # Bcrypt utilities
│   │   ├── validators.ts        # Custom validators
│   │   ├── helpers.ts           # Utility functions
│   │   ├── ApiError.ts          # Custom error class
│   │   ├── ApiResponse.ts       # Standard response format
│   │   └── logger.ts            # Logger configuration
│   │
│   ├── types/
│   │   ├── index.d.ts
│   │   ├── express.d.ts         # Extend Express types
│   │   └── jwt.d.ts
│   │
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   ├── status.ts
│   │   └── messages.ts
│   │
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
│
├── tests/
│   ├── integration/
│   ├── unit/
│   └── fixtures/
│
├── .env.example
├── .env.development
├── .env.test
├── .env.production
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── jest.config.js
├── package.json
└── README.md
```

---

## Database Schema (Prisma)

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  STAFF
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

enum SettlementStatus {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id            String   @id @default(uuid()) @db.Char(36)
  username      String   @unique @db.VarChar(50)
  email         String   @unique @db.VarChar(100)
  passwordHash  String   @db.VarChar(255)
  role          UserRole
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now()) @db.DateTime(0)
  updatedAt     DateTime @updatedAt @db.DateTime(0)

  centers              UserCenter[]
  transactions         Transaction[]
  editRequestsCreated  EditRequest[]      @relation("RequestedBy")
  editRequestsReviewed EditRequest[]      @relation("ReviewedBy")
  settlementsCreated   Settlement[]       @relation("CreatedBy")
  settlementsApproved  Settlement[]       @relation("ApprovedBy")
  auditLogs            AuditLog[]

  @@map("users")
}

model Center {
  id            String   @id @default(uuid()) @db.Char(36)
  centerCode    String   @unique @db.VarChar(20)
  centerName    String   @db.VarChar(100)
  address       String?  @db.Text
  contactNumber String?  @db.VarChar(15)
  email         String?  @db.VarChar(100)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now()) @db.DateTime(0)
  updatedAt     DateTime @updatedAt @db.DateTime(0)

  users        UserCenter[]
  transactions Transaction[]
  settlements  Settlement[]

  @@map("centers")
}

model UserCenter {
  id         String   @id @default(uuid()) @db.Char(36)
  userId     String   @db.Char(36)
  centerId   String   @db.Char(36)
  assignedAt DateTime @default(now()) @db.DateTime(0)

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  center Center @relation(fields: [centerId], references: [id], onDelete: Cascade)

  @@unique([userId, centerId])
  @@map("user_centers")
}

model IncomeSource {
  id            String   @id @default(uuid()) @db.Char(36)
  sourceName    String   @db.VarChar(100)
  sourceCode    String   @unique @db.VarChar(20)
  defaultAmount Decimal? @db.Decimal(10, 2)
  isActive      Boolean  @default(true)

  transactions Transaction[]

  @@map("income_sources")
}

model VehicleType {
  id         String  @id @default(uuid()) @db.Char(36)
  typeName   String  @db.VarChar(50)
  typeCode   String  @unique @db.VarChar(20)
  baseCharge Decimal @db.Decimal(10, 2)
  isActive   Boolean @default(true)

  transactions Transaction[]

  @@map("vehicle_types")
}

model Transaction {
  id                String    @id @default(uuid()) @db.Char(36)
  transactionNumber String    @unique @db.VarChar(50)
  centerId          String    @db.Char(36)
  userId            String    @db.Char(36)
  vehicleTypeId     String?   @db.Char(36)
  vehicleNumber     String?   @db.VarChar(20)
  incomeSourceId    String    @db.Char(36)
  amount            Decimal   @db.Decimal(10, 2)
  transactionDate   DateTime  @db.Date
  transactionTime   DateTime  @db.Time(0)
  notes             String?   @db.Text
  isLocked          Boolean   @default(true)
  createdAt         DateTime  @default(now()) @db.DateTime(0)
  createdBy         String?   @db.Char(36)
  updatedAt         DateTime  @updatedAt @db.DateTime(0)
  updatedBy         String?   @db.Char(36)

  center       Center       @relation(fields: [centerId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  vehicleType  VehicleType? @relation(fields: [vehicleTypeId], references: [id])
  incomeSource IncomeSource @relation(fields: [incomeSourceId], references: [id])
  editRequests EditRequest[]

  @@index([centerId, transactionDate])
  @@index([userId])
  @@map("transactions")
}

model EditRequest {
  id              String        @id @default(uuid()) @db.Char(36)
  transactionId   String        @db.Char(36)
  requestedBy     String        @db.Char(36)
  requestReason   String        @db.Text
  originalData    Json
  proposedChanges Json
  status          RequestStatus @default(PENDING)
  reviewedBy      String?       @db.Char(36)
  reviewNotes     String?       @db.Text
  requestedAt     DateTime      @default(now()) @db.DateTime(0)
  reviewedAt      DateTime?     @db.DateTime(0)

  transaction Transaction @relation(fields: [transactionId], references: [id])
  requester   User        @relation("RequestedBy", fields: [requestedBy], references: [id])
  reviewer    User?       @relation("ReviewedBy", fields: [reviewedBy], references: [id])

  @@index([status])
  @@map("edit_requests")
}

model Settlement {
  id                  String           @id @default(uuid()) @db.Char(36)
  settlementNumber    String           @unique @db.VarChar(50)
  centerId            String           @db.Char(36)
  userId              String           @db.Char(36)
  settlementDate      DateTime         @db.Date
  totalAmount         Decimal          @db.Decimal(10, 2)
  carryForwardAmount  Decimal          @default(0) @db.Decimal(10, 2)
  netAmount           Decimal          @db.Decimal(10, 2)
  status              SettlementStatus @default(PENDING)
  approvedBy          String?          @db.Char(36)
  approvedAt          DateTime?        @db.DateTime(0)
  notes               String?          @db.Text
  createdAt           DateTime         @default(now()) @db.DateTime(0)

  center   Center @relation(fields: [centerId], references: [id])
  user     User   @relation("CreatedBy", fields: [userId], references: [id])
  approver User?  @relation("ApprovedBy", fields: [approvedBy], references: [id])

  @@unique([centerId, settlementDate])
  @@index([centerId, settlementDate])
  @@map("settlements")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Char(36)
  userId     String?  @db.Char(36)
  action     String   @db.VarChar(50)
  entityType String   @db.VarChar(50)
  entityId   String?  @db.Char(36)
  oldData    Json?
  newData    Json?
  ipAddress  String?  @db.VarChar(45)
  userAgent  String?  @db.Text
  createdAt  DateTime @default(now()) @db.DateTime(0)

  user User? @relation(fields: [userId], references: [id])

  @@index([userId, action, createdAt])
  @@map("audit_logs")
}
```

---

## API Architecture

### Standard Response Format

```typescript
// utils/ApiResponse.ts
export class ApiResponse<T = any> {
  constructor(
    public success: boolean,
    public data?: T,
    public message?: string,
    public statusCode: number = 200
  ) {}

  static success<T>(data: T, message = 'Success', statusCode = 200) {
    return new ApiResponse(true, data, message, statusCode);
  }

  static error(message: string, statusCode = 500) {
    return new ApiResponse(false, null, message, statusCode);
  }
}
```

### Custom Error Class

```typescript
// utils/ApiError.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
```

---

## Module Implementation Examples

### 1. Authentication Module

#### auth.service.ts

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { LoginDto, RegisterDto } from './auth.dto';

export class AuthService {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        centers: {
          include: { center: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        centers: user.centers.map((uc) => uc.center),
      },
      token,
      refreshToken,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash
    );

    if (!isOldPasswordValid) {
      throw ApiError.badRequest('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  private generateToken(userId: string, role: string) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  private generateRefreshToken(userId: string) {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }
}
```

#### auth.controller.ts

```typescript
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';

const authService = new AuthService();

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.json(ApiResponse.success(result, 'Login successful'));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    // Implement token blacklist if needed
    res.json(ApiResponse.success(null, 'Logout successful'));
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user!.userId,
      oldPassword,
      newPassword
    );
    res.json(ApiResponse.success(result));
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        centers: {
          include: { center: true },
        },
      },
    });
    res.json(ApiResponse.success(user));
  });
}
```

### 2. Transaction Module

#### transaction.service.ts

```typescript
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { generateTransactionNumber } from '../utils/helpers';
import type { CreateTransactionDto, UpdateTransactionDto } from './transaction.dto';

export class TransactionService {
  async create(userId: string, dto: CreateTransactionDto) {
    // Validate user has access to center
    const userCenter = await prisma.userCenter.findFirst({
      where: {
        userId,
        centerId: dto.centerId,
      },
    });

    if (!userCenter) {
      throw ApiError.forbidden('You do not have access to this center');
    }

    const transactionNumber = await generateTransactionNumber();

    const transaction = await prisma.transaction.create({
      data: {
        transactionNumber,
        centerId: dto.centerId,
        userId,
        vehicleTypeId: dto.vehicleTypeId,
        vehicleNumber: dto.vehicleNumber,
        incomeSourceId: dto.incomeSourceId,
        amount: dto.amount,
        transactionDate: dto.transactionDate,
        transactionTime: dto.transactionTime,
        notes: dto.notes,
        isLocked: true,
        createdBy: userId,
      },
      include: {
        center: true,
        vehicleType: true,
        incomeSource: true,
      },
    });

    // Audit log
    await this.createAuditLog(userId, 'CREATE', 'TRANSACTION', transaction.id, null, transaction);

    return transaction;
  }

  async findAll(userId: string, filters: any) {
    const { centerId, startDate, endDate, incomeSourceId, page = 1, limit = 50 } = filters;

    const where: any = {};

    // Staff can only see their center's transactions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { centers: true },
    });

    if (user!.role === 'STAFF') {
      const centerIds = user!.centers.map((uc) => uc.centerId);
      where.centerId = { in: centerIds };
    } else if (centerId) {
      where.centerId = centerId;
    }

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (incomeSourceId) {
      where.incomeSourceId = incomeSourceId;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          center: true,
          vehicleType: true,
          incomeSource: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(userId: string, transactionId: string, dto: UpdateTransactionDto) {
    // Only admin can update
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user!.role !== 'ADMIN') {
      throw ApiError.forbidden('Only admin can update transactions');
    }

    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!existing) {
      throw ApiError.notFound('Transaction not found');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.createAuditLog(userId, 'UPDATE', 'TRANSACTION', transactionId, existing, updated);

    return updated;
  }

  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldData: any,
    newData: any
  ) {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldData: oldData || undefined,
        newData: newData || undefined,
      },
    });
  }
}
```

### 3. Dashboard Module

#### dashboard.service.ts

```typescript
import { prisma } from '../config/database';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export class DashboardService {
  async getOverview(userId: string, centerId?: string) {
    const today = new Date();
    const where: any = {
      transactionDate: {
        gte: startOfDay(today),
        lte: endOfDay(today),
      },
    };

    if (centerId) {
      where.centerId = centerId;
    }

    const [todayRevenue, weekRevenue, monthRevenue, totalRevenue] = await Promise.all([
      this.getRevenue(where),
      this.getRevenue({
        ...where,
        transactionDate: {
          gte: subDays(today, 7),
          lte: endOfDay(today),
        },
      }),
      this.getRevenue({
        ...where,
        transactionDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
          lte: endOfDay(today),
        },
      }),
      this.getRevenue(centerId ? { centerId } : {}),
    ]);

    return {
      today: todayRevenue,
      week: weekRevenue,
      month: monthRevenue,
      total: totalRevenue,
    };
  }

  async getCenterPerformance(startDate: Date, endDate: Date) {
    const result = await prisma.transaction.groupBy({
      by: ['centerId'],
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const centers = await prisma.center.findMany({
      where: {
        id: {
          in: result.map((r) => r.centerId),
        },
      },
    });

    return result.map((r) => ({
      center: centers.find((c) => c.id === r.centerId)!,
      totalAmount: r._sum.amount,
      transactionCount: r._count.id,
    }));
  }

  async getIncomeBreakdown(startDate: Date, endDate: Date, centerId?: string) {
    const where: any = {
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (centerId) {
      where.centerId = centerId;
    }

    const result = await prisma.transaction.groupBy({
      by: ['incomeSourceId'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        id: {
          in: result.map((r) => r.incomeSourceId),
        },
      },
    });

    return result.map((r) => ({
      incomeSource: incomeSources.find((is) => is.id === r.incomeSourceId)!,
      totalAmount: r._sum.amount,
      transactionCount: r._count.id,
    }));
  }

  private async getRevenue(where: any) {
    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalAmount: result._sum.amount || 0,
      transactionCount: result._count.id,
    };
  }
}
```

---

## Middleware Implementation

### auth.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';

export interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
    } else {
      next(error);
    }
  }
};
```

### roleGuard.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};
```

### errorHandler.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      message: 'Database error',
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
```

### rateLimiter.ts

```typescript
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Testing Examples

### transaction.test.ts

```typescript
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';

describe('Transaction API', () => {
  let authToken: string;
  let testUser: any;
  let testCenter: any;

  beforeAll(async () => {
    // Create test user and center
    testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'STAFF',
      },
    });

    testCenter = await prisma.center.create({
      data: {
        centerCode: 'TC001',
        centerName: 'Test Center',
      },
    });

    await prisma.userCenter.create({
      data: {
        userId: testUser.id,
        centerId: testCenter.id,
      },
    });

    // Login to get token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
      });

    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.userCenter.deleteMany();
    await prisma.center.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a new transaction', async () => {
      const incomeSource = await prisma.incomeSource.findFirst();
      const vehicleType = await prisma.vehicleType.findFirst();

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          centerId: testCenter.id,
          vehicleNumber: 'DL01AB1234',
          vehicleTypeId: vehicleType!.id,
          incomeSourceId: incomeSource!.id,
          amount: 50,
          transactionDate: new Date().toISOString(),
          transactionTime: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionNumber');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('should return list of transactions', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
    });
  });
});
```

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database (MySQL)
DATABASE_URL="mysql://pollution_admin:secure_password@localhost:3306/pollution_center_db"

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  }
}
```

---

## MySQL-Specific Notes

### UUID Handling
- MySQL stores UUIDs as CHAR(36)
- Use `@db.Char(36)` annotation in Prisma schema
- UUID generation happens in application layer

### JSON Support
- MySQL 8.0+ has native JSON type
- Prisma handles JSON serialization/deserialization automatically
- Can use JSON functions in raw queries if needed

### Date/Time Handling
- Use `@db.DateTime(0)` for timestamp precision
- Use `@db.Date` for date-only fields
- Use `@db.Time(0)` for time-only fields

### Connection Pool Configuration
In `config/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Connection pool is managed automatically by Prisma
// Default pool size: 10 connections
```

### Performance Tips
1. Use indexes on foreign keys and frequently queried columns
2. Use `SELECT` specific fields instead of `SELECT *`
3. Use transactions for multiple related operations
4. Consider adding composite indexes for complex queries
5. Use `EXPLAIN` to analyze slow queries

### Backup Commands
```bash
# Backup
mysqldump -u pollution_admin -p pollution_center_db > backup.sql

# Backup with compression
mysqldump -u pollution_admin -p pollution_center_db | gzip > backup.sql.gz

# Restore
mysql -u pollution_admin -p pollution_center_db < backup.sql

# Restore from compressed
gunzip < backup.sql.gz | mysql -u pollution_admin -p pollution_center_db
```

---

This backend specification provides a complete blueprint for implementing a secure, scalable, and maintainable Node.js + TypeScript API with MySQL database.
