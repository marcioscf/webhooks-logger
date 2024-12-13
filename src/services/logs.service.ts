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

  public async getStoreWhatsappStats(storeId: string): Promise<any[]> {
    const logAnalysis = await LogModel.aggregate([
      {
        $match: {
          "log.event": "MESSAGE_WHATSAPP",
          "log.store": storeId,
        },
      },
      {
        $addFields: {
          chat: {
            $cond: {
              if: "$log.message.fromMe",
              then: "$log.message.otherInfo.to",
              else: "$log.message.otherInfo.author",
            },
          },
        },
      },
      {
        $addFields: {
          eventDate: {
            $toDate: {
              $multiply: ["$log.message.date", 1000],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            d: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$eventDate",
              },
            },
            chat: "$chat",
            store: "$log.store",
          },
          events: {
            $addToSet: {
              date: "$eventDate",
              fromMe: "$log.message.fromMe",
              message: "$log.message.message",
            },
          },
        },
      },
      {
        $addFields: {
          events: {
            $sortArray: {
              input: "$events",
              sortBy: {
                date: 1,
              },
            },
          },
        },
      },
      {
        $addFields: {
          events: {
            $arrayElemAt: ["$events", 0],
          },
        },
      },
      {
        $group: {
          _id: {
            store: "$_id.store",
            d: "$_id.d",
            fromMe: "$events.fromMe",
          },
          mensagens: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            store: "$_id.store",
            fromMe: "$_id.fromMe",
          },
          mensagens: {
            $sum: "$mensagens",
          },
          dias: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.store": 1,
        },
      },
    ]);

    return logAnalysis;
  }
}
