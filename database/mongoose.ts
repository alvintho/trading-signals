import mongoose from "mongoose";

const MONGO_DB_URI = process.env.MONGODB_URI;

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null
    }
}


// hot reload doesn't create a new connection whenever we make a new request
let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null }
}

export const connectToDatabase = async () => {
    if (!MONGO_DB_URI) throw new Error("MongoDB_URI must be set within env");

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGO_DB_URI, { bufferCommands: false });
    }

    try{
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null;
        throw err;
    }

    console.log(`Connected to MongoDB database ${process.env.NODE_ENV} - ${MONGO_DB_URI}`);

    return cached.conn;
}