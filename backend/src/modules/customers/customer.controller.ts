import { Response } from 'express';
import { CustomerService } from './customer.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { customerFiltersSchema, customerDetailFiltersSchema } from './customer.dto';
import { AuthRequest } from '../../middleware/auth';

const customerService = new CustomerService();

export class CustomerController {
  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = customerFiltersSchema.parse(req.query);
    const result = await customerService.findAll(filters);
    res.json(ApiResponse.success(result));
  });

  findByMobile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { mobile } = req.params;
    const filters = customerDetailFiltersSchema.parse(req.query);
    const result = await customerService.findByMobile(mobile, filters);
    res.json(ApiResponse.success(result));
  });
}
