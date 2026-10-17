import mongoose from 'mongoose';

// Prevent Mongoose from buffering queries when disconnected, avoiding 10-second request timeouts
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 1000);

export interface DatabaseStatus {
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  host?: string;
  name?: string;
  message: string;
}

let lastConnectionError: string | null = null;

export const connectDB = async (): Promise<boolean> => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    lastConnectionError = 'MONGO_URI is not defined in environment variables.';
    console.warn('⚠️ [MongoDB] MONGO_URI is not defined in .env. MongoDB is not connected yet.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    lastConnectionError = null;
    console.log(`✅ [MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return true;
  } catch (error: any) {
    lastConnectionError = error?.message || 'Failed to connect to MongoDB';
    console.error(`❌ [MongoDB] Connection error: ${lastConnectionError}`);
    return false;
  }
};

export const getDBStatus = (): DatabaseStatus => {
  const readyState = mongoose.connection.readyState;
  
  switch (readyState) {
    case 1:
      return {
        isConnected: true,
        status: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        message: 'MongoDB is actively connected and ready for queries.',
      };
    case 2:
      return {
        isConnected: false,
        status: 'connecting',
        message: 'MongoDB is currently attempting to establish connection.',
      };
    case 3:
      return {
        isConnected: false,
        status: 'disconnected',
        message: 'MongoDB is disconnecting.',
      };
    case 0:
    default:
      return {
        isConnected: false,
        status: lastConnectionError ? 'error' : 'disconnected',
        message: lastConnectionError || (process.env.MONGO_URI ? 'Disconnected from database.' : 'MONGO_URI not configured in .env.'),
      };
  }
};
