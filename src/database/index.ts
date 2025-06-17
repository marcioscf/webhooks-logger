import { connect, set } from 'mongoose';
import { readFileSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { NODE_ENV, DB_HOST, DB_PORT, DB_DATABASE, DB_URL } from '@config';
import { createTunnel } from 'tunnel-ssh';

export const dbConnection = async () => {
  // Check environment
  console.log(`Running in ${NODE_ENV} mode`);
  if (NODE_ENV === 'production') {
    // Production connection - direct connection to MongoDB
    try {
      console.log('Connecting directly to MongoDB in production mode');
      const uri = DB_URL || `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
      await connect(uri);
      console.log('MongoDB connected successfully in production mode');
      return;
    } catch (error) {
      console.error('Production database connection error:', error);
      throw error;
    }
  }
  // Development connection with SSH tunnel
  const tunnelOptions = {
    autoClose: true,
    reconnectOnError: true,
  };

  const privateKey = readFileSync('/home/luiz/Downloads/LOGGER.pem');
  const sshOptions = {
    host: '54.157.141.74',
    privateKey: privateKey,
    port: 22,
    username: 'ubuntu',
  };

  const serverOptions = {
    port: 27018,
  };
  const forwardOptions = {
    srcAddr: '0.0.0.0',
    srcPort: 27018,
    dstAddr: '127.0.0.1',
    dstPort: 27017,
  };

  try {
    await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
    console.log('SSH tunnel established');

    // MongoDB URI using the tunneled port
    const uri = `mongodb://localhost:27018/logger`;

    // For debugging
    console.log('Connecting to MongoDB with URI:', uri);

    // Connect Mongoose to the tunneled MongoDB instance
    await connect(uri);

    console.log('Mongoose connected successfully');

    // Return the MongoClient for any direct operations
    const client = new MongoClient(uri);

    await client.connect();
    const logs = await client.db().collection('logs').find({}).limit(10).toArray();
    console.log('logs', logs);
    console.log('MongoClient connected successfully');

    return client;
  } catch (error) {
    console.error('Development database connection error:', error);
    throw error;
  }
};
