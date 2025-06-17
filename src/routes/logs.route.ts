import { Router } from 'express';
import { LogController } from '@/controllers/logs.controller';
import { Routes } from '@interfaces/routes.interface';

export class LogRoute implements Routes {
  public path = '/logs';
  public router: Router = Router();
  public log = new LogController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.log.getLogs);
    this.router.get(`${this.path}/store/whatsapp/:id`, this.log.getStoreWhatsappStats);
    this.router.put(`${this.path}/external/:id`, this.log.getLogByExternalId);
    this.router.get(`${this.path}/:id`, this.log.getLogById);
    this.router.post(`${this.path}`, this.log.createLog);
    this.router.delete(`${this.path}/:id`, this.log.deleteLog);
    this.router.get(`${this.path}/storelogs/:id`, this.log.getStoreLogs);
    this.router.get(`${this.path}/msglogs/:id`, this.log.getMsgLogs);
  }
}
