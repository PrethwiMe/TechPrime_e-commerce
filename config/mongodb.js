const { MongoClient } = require('mongodb');
const dbname = require('./databse'); // your collection info
const uri = "mongodb+srv://developer:techprime_project@cluster0.gg1tlfp.mongodb.net/techprime_db?retryWrites=true&w=majority&tls=true";

let db;

const connectDB = async () => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbname.dbName);
    console.log('✅ MongoDB connected');
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
};

module.exports = { connectDB, getDB };
