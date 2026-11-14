import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service.js';

export class UserController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.findAll(req.query as any);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.findById(req.params.id as string);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.params.id as string, req.body, req.user!);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
