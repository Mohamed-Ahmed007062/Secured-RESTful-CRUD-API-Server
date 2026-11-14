import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service.js';

export class ProductController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.create(req.body, req.user!);
      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.findAll(req.query as any);
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
      const product = await productService.findById(req.params.id as string);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.update(req.params.id as string, req.body, req.user!);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await productService.delete(req.params.id as string, req.user!);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
