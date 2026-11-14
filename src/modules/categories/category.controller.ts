import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service.js';

export class CategoryController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await categoryService.findAll(req.query as any);
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
      const category = await categoryService.findById(req.params.id as string);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.update(req.params.id as string, req.body);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await categoryService.delete(req.params.id as string);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
