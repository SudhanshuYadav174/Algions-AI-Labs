import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || 'root';
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(issue.message);
        }
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      return res.status(400).json({ error: 'Malformed request body' });
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || 'root';
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(issue.message);
        }
        return res.status(400).json({
          error: 'Query validation failed',
          details: errors,
        });
      }
      return res.status(400).json({ error: 'Malformed query parameters' });
    }
  };
}
