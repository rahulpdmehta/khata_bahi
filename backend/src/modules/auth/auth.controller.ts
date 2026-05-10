import { Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { loginSchema, changePasswordSchema } from './auth.dto';
import { AuthRequest } from '../../middleware/auth';

const authService = new AuthService();

export class AuthController {
  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);
    res.json(ApiResponse.success(result, 'Login successful'));
  });

  logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json(ApiResponse.success(null, 'Logout successful'));
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.userId, validatedData);
    res.json(ApiResponse.success(result));
  });

  me = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getProfile(req.user!.userId);
    res.json(ApiResponse.success(user));
  });
}
