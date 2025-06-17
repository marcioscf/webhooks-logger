import { hash } from 'bcrypt';
import { Service } from 'typedi';
import { HttpException } from '@/exceptions/HttpException';
import { Log } from '@/interfaces/logs.interface';
import { LogModel } from '@/models/logs.model';
import { ObjectId } from 'mongodb';
@Service()
export class LogService {
  public async findAllLog(): Promise<Log[]> {
    const logs: Log[] = await LogModel.find();
    return logs;
  }

  public async findStoreLogs(storeId: string, startDate: string, endDate: string): Promise<Log[]> {
    const logs: Log[] = await LogModel.find({
      $or: [{ 'log.client.store': storeId }, { 'log.store': storeId }],
      createdAt: { $gte: startDate, $lte: endDate },
    }).limit(30);
    console.log('logs', logs.length);
    return logs;
  }

  public async findMsgLogs(storeId: string, startDate: string, endDate: string, diffInDays: number): Promise<any> {
    const logs: any = await LogModel.aggregate([
      {
        $match: {
          'log.client.store': storeId,
          'log.data.event': 'WPP_MESSAGE_UPSERT',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $facet: {
          highFrequencyConversations: [
            {
              $match: {
                'log.data.m.message.protocolMessage.type': {
                  $nin: [
                    'EPHEMERAL_SYNC_RESPONSE',
                    'HISTORY_SYNC_NOTIFICATION',
                    'INITIAL_SECURITY_NOTIFICATION_SETTING_SYNC',
                    'APP_STATE_SYNC_KEY_SHARE',
                  ],
                },
                'log.data.m.key.remoteJid': {
                  $ne: 'status@broadcast',
                },
              },
            },
            {
              $addFields: {
                mes: {
                  $ifNull: [
                    {
                      $first: '$log.data.m.message.conversation',
                    },
                    {
                      $first: '$log.data.m.message.extendedTextMessage.text',
                    },
                  ],
                },
                img: {
                  $ifNull: [
                    {
                      $first: '$log.data.m.message.imageMessage.caption',
                    },
                    {
                      $first: '$log.data.m.message.stickerMessage.fileSha256',
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  $ifNull: ['$mes', '$img'],
                },
                fieldN: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                fieldN: -1,
              },
            },
            {
              $limit: 11,
            },
          ],
          averageMessagesPerDay: [
            {
              $group: {
                _id: '$log.data.m.key.fromMe',
                total: {
                  $sum: 1,
                },
                msgRepeated: {
                  $first: '$msgRepeated',
                },
              },
            },
            {
              $project: {
                fromMe: {
                  $first: '$_id',
                },
                averagePerDay: {
                  $round: [
                    {
                      $divide: ['$total', diffInDays],
                    },
                    0,
                  ],
                },
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $addFields:
          /**
           * newField: The new field name.
           * expression: The new field expression.
           */
          {
            totalAveragePerDay: {
              $sum: {
                $map: {
                  input: '$averageMessagesPerDay',
                  as: 'item',
                  in: '$$item.averagePerDay',
                },
              },
            },
          },
      },
    ]);
    console.log('logs', logs[0].highFrequencyConversations);
    const FilteredhighFrequencyConversations = logs[0].highFrequencyConversations?.filter((log: any) => log._id !== null);
    const FilteredLogs = {
      highFrequencyConversations: FilteredhighFrequencyConversations,
      averageMessagesPerDay: logs[0].averageMessagesPerDay,
      totalAveragePerDay: logs[0].totalAveragePerDay,
    };
    return FilteredLogs;
  }

  public async findLogByExternalId(externalId: string): Promise<Log> {
    const findLog: Log = await LogModel.findOne({ externalId });
    if (!findLog) throw new HttpException(409, "Log doesn't exist");

    return findLog;
  }

  public async findLogById(logId: string): Promise<Log> {
    const findLog: Log = await LogModel.findById(new ObjectId(logId));
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
          'log.event': 'MESSAGE_WHATSAPP',
          'log.store': storeId,
        },
      },
      {
        $addFields: {
          chat: {
            $cond: {
              if: '$log.message.fromMe',
              then: '$log.message.otherInfo.to',
              else: '$log.message.otherInfo.author',
            },
          },
        },
      },
      {
        $addFields: {
          eventDate: {
            $toDate: {
              $multiply: ['$log.message.date', 1000],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            d: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$eventDate',
              },
            },
            chat: '$chat',
            store: '$log.store',
          },
          events: {
            $addToSet: {
              date: '$eventDate',
              fromMe: '$log.message.fromMe',
              message: '$log.message.message',
            },
          },
        },
      },
      {
        $addFields: {
          events: {
            $sortArray: {
              input: '$events',
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
            $arrayElemAt: ['$events', 0],
          },
        },
      },
      {
        $group: {
          _id: {
            store: '$_id.store',
            d: '$_id.d',
            fromMe: '$events.fromMe',
          },
          mensagens: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            store: '$_id.store',
            fromMe: '$_id.fromMe',
          },
          mensagens: {
            $sum: '$mensagens',
          },
          dias: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          '_id.store': 1,
        },
      },
    ]);

    return logAnalysis;
  }
}
