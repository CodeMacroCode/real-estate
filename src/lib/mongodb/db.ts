import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/real_estate_crm';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesRepaired?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function repairUserIndexes(): Promise<void> {
  if (cached.indexesRepaired) return;
  try {
    const { User } = require('@/models/User');
    if (!User || !User.collection) return;

    // 1. Unset null or empty employeeId / username from existing records
    await User.updateMany(
      { employeeId: { $in: [null, ''] } },
      { $unset: { employeeId: 1 } }
    ).catch(() => {});

    await User.updateMany(
      { username: { $in: [null, ''] } },
      { $unset: { username: 1 } }
    ).catch(() => {});

    // 2. Inspect collection indexes in MongoDB
    const indexes = await User.collection.indexes();
    for (const idx of indexes) {
      if ((idx.name === 'employeeId_1' || (idx.key && idx.key.employeeId)) && idx.name) {
        const isSparse = Boolean(idx.sparse);
        const hasPartial = Boolean(idx.partialFilterExpression?.employeeId);
        if (!isSparse || !hasPartial) {
          console.log(`[DB] Dropping legacy employeeId index '${idx.name}'...`);
          await User.collection.dropIndex(idx.name).catch(() => {});
          await User.collection.createIndex(
            { employeeId: 1 },
            {
              unique: true,
              sparse: true,
              partialFilterExpression: { employeeId: { $type: 'string' } },
              background: true,
            }
          );
          console.log('[DB] Recreated employeeId_1 with unique, sparse & partialFilterExpression');
        }
      }
    }

    cached.indexesRepaired = true;
  } catch (err: any) {
    console.warn('[DB] repairUserIndexes warning:', err?.message || err);
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      // Ensure all critical Mongoose models are registered in memory across HMR
      require("@/models/Role");
      require("@/models/User");
      require("@/models/Lead");
      require("@/models/Client");
      require("@/models/Appointment");
      require("@/models/ClientConfirmation");
      require("@/models/Owner");
      require("@/models/Property");
      require("@/models/Project");
      require("@/models/ProjectUnit");
      require("@/models/Booking");
      require("@/models/StoredFile");

      // Self-heal user indexes safely in background
      repairUserIndexes().catch((err) => {
        console.warn('[DB] Self-heal user indexes notice:', err?.message || err);
      });

      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
