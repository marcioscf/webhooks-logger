import { hash } from 'bcrypt';
import { Service } from 'typedi';
import { HttpException } from '@/exceptions/HttpException';
import { Log } from '@/interfaces/logs.interface';
import { LogModel } from '@/models/logs.model';

@Service()
export class LogService {
  public async findAllLog(): Promise<Log[]> {
    const logs: Log[] = await LogModel.find();
    return logs;
  }

  public async findLogByExternalId(externalId: string): Promise<Log> {
    const findLog: Log = await LogModel.findOne({ externalId });
    if (!findLog) throw new HttpException(409, "Log doesn't exist");

    return findLog;
  }

  public async findLogById(logId: string): Promise<Log> {
    const findLog: Log = await LogModel.findOne({ _id: logId });
    if (!findLog) throw new HttpException(409, "Log doesn't exist");

    return findLog;
  }

  public async createLog(logData: any): Promise<Log> {
    const { externalId, ...log } = logData;

    const createLogData: any = await LogModel.create({ log, externalId });
    return createLogData;
  }

  public async deleteLog(logId: string): Promise<Log> {
    const deleteLogById: Log = await LogModel.findByIdAndDelete(logId);
    if (!deleteLogById) throw new HttpException(409, "Log doesn't exist");

    return deleteLogById;
  }
}
