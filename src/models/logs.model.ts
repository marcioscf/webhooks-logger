import { model, Schema, Document } from 'mongoose';
import { Log } from '@/interfaces/logs.interface';

const LogSchema: Schema = new Schema({
  externalId: {
    type: String,
    required: false,
  },
  log: { type: Object, required: true },
}, { timestamps: true });

export const LogModel = model<Log & Document>('Log', LogSchema);
