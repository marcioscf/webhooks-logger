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

  public async getStoreBlockAnalysis(storeId: string, startDateObj: Date, endDateObj: Date): Promise<any[]> {
    const logAnalysis = await LogModel.aggregate([
      {
        $match: {
          createdAt: {
            $gt: startDateObj,
            $lt: endDateObj,
          },
          $or: [
            {
              'log.client.store': storeId,
              'log.data.m.messageStubType': {
                $nin: [
                  'CIPHERTEXT',
                  'GROUP_CHANGE_ICON',
                  'REVOKE',
                  'FUTUREPROOF',
                  'GROUP_CHANGE_DESCRIPTION',
                  'GROUP_PARTICIPANT_DEMOTE',
                  'GROUP_PARTICIPANT_PROMOTE',
                  'GROUP_MEMBERSHIP_JOIN_APPROVAL_MODE',
                  'GROUP_CHANGE_ANNOUNCE',
                  'GROUP_PARTICIPANT_CHANGE_NUMBER',
                  'GROUP_PARTICIPANT_REMOVE',
                  'GROUP_PARTICIPANT_LEAVE',
                  'GROUP_PARTICIPANT_ADD',
                  2,
                ],
              },
              'log.data.m.message.protocolMessage.type': {
                $nin: [
                  'EPHEMERAL_SYNC_RESPONSE',
                  'HISTORY_SYNC_NOTIFICATION',
                  'INITIAL_SECURITY_NOTIFICATION_SETTING_SYNC',
                  'APP_STATE_SYNC_KEY_SHARE',
                  'REVOKE',
                  'MESSAGE_EDIT',
                  'PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE',
                ],
              },
              'log.data.m.key.remoteJid': {
                $ne: 'status@broadcast',
              },
              'log.data.event': 'WPP_MESSAGE_UPSERT',
            },
            {
              'log.event': 'MESSAGE_WHATSAPP',
              'log.store': storeId,
              'log.message.message': {
                $ne: null,
              },
              'log.message.otherInfo.broadcast': {
                $ne: true,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          fromMe: {
            $ifNull: [
              {
                $first: '$log.data.m.key.fromMe',
              },
              false,
            ],
          },
          isGroup: {
            $let: {
              vars: {
                groupId: {
                  $ifNull: [
                    {
                      $toString: {
                        $first: '$log.data.m.key.remoteJid',
                      },
                    },
                    '',
                  ],
                },
              },
              in: {
                $regexMatch: {
                  input: '$$groupId',
                  regex: 'g',
                  options: 'i',
                },
              },
            },
          },
          mes: {
            $ifNull: [
              '$log.message.otherInfo.body',
              {
                $ifNull: [
                  {
                    $ifNull: [
                      {
                        $first: '$log.data.m.message.conversation',
                      },
                      {
                        $first: '$log.data.m.message.extendedTextMessage.text',
                      },
                    ],
                  },
                  {
                    $ifNull: [
                      {
                        $first: '$log.data.m.message.imageMessage.caption',
                      },
                      {
                        $first: '$log.data.m.message.imageMessage.fileSha256',
                      },
                      {
                        $first: '$log.data.m.message.stickerMessage.fileSha256',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $facet: {
          repetidas: [
            {
              $match: {
                fromMe: true,
              },
            },
            {
              $group: {
                _id: '$mes',
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                count: -1,
              },
            },
            {
              $limit: 10,
            },
          ],
          ratio: [
            {
              $group: {
                _id: {
                  fromMe: '$fromMe',
                  isGroup: '$isGroup',
                },
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                fromMe: '$_id.fromMe',
                isGroup: '$_id.isGroup',
                count: 1,
              },
            },
          ],
        },
      },
    ]);

    return logAnalysis;
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
