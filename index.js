const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());


const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db, foods, requests;

async function connectDB() {
  if (!client.topology?.isConnected()) {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    foods = db.collection('foods');
    requests = db.collection('requests');
    // console.log("MongoDB connected");
  }
}
connectDB().catch(console.error);

module.exports = app;
