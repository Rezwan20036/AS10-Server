const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

let serviceAccount;

try {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
    serviceAccount = JSON.parse(decoded);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });  
} catch (err) {
//   console.error("Failed:", err.message);
}

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

// --- Firebase Middleware ---
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: 'unauthorized access' });
  const token = authHeader.split(' ')[1];
  if (!admin.apps.length) return res.status(500).send({ message: 'firebase admin not configured' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.token_email = decoded.email;
    req.token_name = decoded.name;
    req.token_photo = decoded.picture;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
}

// --- Routes ---
app.get('/', (req, res) => {
  res.send({ ok: true, message: 'FoodBridge server running' });
});
// --- Foods ---
app.get('/foods', async (req, res) => {
  try {
    await connectDB();
    const query = {};
    if (req.query.status) query.food_status = req.query.status;
    const items = await foods.find(query).toArray();
    res.send(items);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

app.get('/foods/:id', async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;
    const item = await foods.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).send({ message: 'Not found' });
    const foodRequests = await requests.find({ food_id: id }).toArray();
    item.requests = foodRequests;
    res.send(item);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});
app.post('/foods', verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const payload = req.body;
    if (!payload.donator_email) payload.donator_email = req.token_email;
    const result = await foods.insertOne(payload);
    res.send({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

app.patch('/foods/:id', verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;
    const update = req.body;
    const existing = await foods.findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).send({ message: 'Not found' });
    if (existing.donator_email !== req.token_email) return res.status(403).send({ message: 'forbidden' });
    const result = await foods.updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

app.delete('/foods/:id', verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;
    const existing = await foods.findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).send({ message: 'Not found' });
    if (existing.donator_email !== req.token_email) return res.status(403).send({ message: 'forbidden' });
    const result = await foods.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

// --- Requests ---
app.post('/requests', verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const payload = req.body;
    payload.requester_email = req.token_email;
    payload.requester_name = req.token_name;
    payload.requester_photo = req.token_photo;
    payload.status = 'pending';
    payload.created_at = new Date().toISOString();
    const result = await requests.insertOne(payload);
    res.send({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

app.get('/requests', async (req, res) => {
  try {
    await connectDB();
    const query = {};
    if (req.query.status) query.status = req.query.status;
    const result = await requests.find(query).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});

app.get('/foods/:id/requests', verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const foodId = req.params.id;
    const foodItem = await foods.findOne({ _id: new ObjectId(foodId) });
    if (!foodItem) return res.status(404).send({ message: 'food not found' });
    if (foodItem.donator_email !== req.token_email) return res.status(403).send({ message: 'forbidden' });
    const result = await requests.find({ food_id: foodId }).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Server Error' });
  }
});


module.exports = app;
