import mongoose from 'mongoose';

// MongoDB connection string from environment variable
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/app-name';

// Connection state
let isConnected = false;

/**
 * Connect to MongoDB using Mongoose
 * Reuses existing connection if already connected
 */
export async function connectToMongoDB() {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URL, {
      // Mongoose 8.x uses these options by default, but we can be explicit
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    isConnected = true;
    console.log('✅ Connected to MongoDB successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    isConnected = false;
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromMongoDB() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Export mongoose instance for model definitions
export { mongoose };

// Preload all models to ensure they're registered with Mongoose
// This prevents "Model not registered" errors when using models in routes/services
import '~/models/Recipe';
import '~/models/Setting';
import '~/models/AutomationLog';
import '~/models/Shop';
import '~/models/JobMetric';
