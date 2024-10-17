import { Router } from 'express';
import { LogController } from '@/controllers/logs.controller';
import { Routes } from '@interfaces/routes.interface';
import { ValidationMiddleware } from '@middlewares/validation.middleware';

export class LogRoute implements Routes {
  public path = '/logs';
  public router = Router();
  public log = new LogController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.log.getLogs);
    this.router.put(`${this.path}/external/:id`, this.log.getLogByExternalId);
    this.router.get(`${this.path}/:id`, this.log.getLogById);
    this.router.post(`${this.path}`, this.log.createLog);
    this.router.delete(`${this.path}/:id`, this.log.deleteLog);
  }
}
