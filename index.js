const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ihpbk8d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db('tasteTracker').collection('foods')
    const foodPurchaseCollection = client.db('tasteTracker').collection('purchase')
    const imageCollection = client.db('tasteTracker').collection('images')

    // get all foods data from db
    app.get('/foods', async (req, res) => {
      const cursor = foodCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.post('/foods', async (req, res) => {
      const newFood = req.body;
      console.log(newFood);
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    })

    app.post('/images', async (req, res) => {
      const newImage = req.body;
      console.log(newImage);
      const result = await imageCollection.insertOne(newImage);
      res.send(result);
    })

    app.get('/foods/:email', async (req, res) => {
      console.log(req.params.email);
      const result = await foodCollection.find({ email: req.params.email }).toArray();
      res.send(result);
    })

    // get a single food data from db
    app.get('/food/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query)
      res.send(result)
    })

    // purchase 
    app.post('/purchase', async (req, res) => {
      const purchase = req.body
      // console.log(purchase);
      const result = await foodPurchaseCollection.insertOne(purchase)
      res.send(result)
    })


    app.get('/purchase', async (req, res) => {
      const cursor = foodPurchaseCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })


    app.get('/purchase/:email', async (req, res) => {
      console.log(req.params.email);
      const result = await foodPurchaseCollection.find({ buyerEmail: req.params.email }).toArray();
      res.send(result);
    })

    app.patch('/food/:id',async(req,res)=>{
      const id = req.params.id
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFood = req.body;
      const food = {
        $set: {
          foodName: updatedFood.foodName,
          image: updatedFood.image,
          category: updatedFood.category,
          description: updatedFood.description,
          price: updatedFood.price,
          origin: updatedFood.origin,
          quantity: updatedFood.quantity,
        }
      }

      const result = await foodCollection.updateOne(filter, food, options);
      res.send(result);
    })

    app.delete('/purchase/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await foodPurchaseCollection.deleteOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('TasteTracker is running on')
})

app.listen(port, () => {
  console.log(`TasteTracker Server is running on port: ${port}`);
})