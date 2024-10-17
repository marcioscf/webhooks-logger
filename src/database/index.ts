import { connect, set } from 'mongoose';
import { NODE_ENV, DB_HOST, DB_PORT, DB_DATABASE, DB_URL } from '@config';

export const dbConnection = async () => {
  const dbConfig = {
    url: DB_URL ? DB_URL : `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`
  };

  if (NODE_ENV !== 'production') {
    set('debug', true);
  }

  await connect(dbConfig.url);
};
