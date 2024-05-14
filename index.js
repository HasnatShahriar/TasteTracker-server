const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// const corsOptions = {
//   origin: ['http://localhost:5173','http://localhost:5174','https://taste-tracker2024.netlify.app'],
//   credentials: true,
//   optionSuccessStatus: 200,
// }

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173','http://localhost:5174','https://taste-tracker2024.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ihpbk8d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = (req,res,next)=>{
  console.log('log: info',req.method,req.url);
  next();
}

const verifyToken =(req,res,next)=>{
  const token = req?.cookies?.token;
  console.log('token in the middleware',token);
  if(!token){
    return req.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
    if(err){
      return res.status(401).send({message:'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db('tasteTracker').collection('foods')
    const foodPurchaseCollection = client.db('tasteTracker').collection('purchase')
    const imageCollection = client.db('tasteTracker').collection('images')


    app.post('/jwt', logger, async (req, res) => {
      try {
        const user = req.body;
        console.log('user for token', user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '7d'
        });
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        }).send({ success: true });
      } catch (err) {
        console.error("Error generating JWT:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post('/logout',logger, async(req,res)=>{
      const user = req.body;
      console.log('logging out',user);
      res.clearCookie('token',{maxAge: 0}).send({success: true})
    })


    // get all foods data from db
    app.get('/foods', async (req, res) => {
      const cursor = foodCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.post('/foods', async (req, res) => {
      const newFood = req.body;
      // console.log(newFood);
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    })


    app.get('/images', async (req, res) => {
      const cursor = imageCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.post('/images', async (req, res) => {
      const newImage = req.body;
      // console.log(newImage);
      const result = await imageCollection.insertOne(newImage);
      res.send(result);
    })

    app.get('/foods/:email', async (req, res) => {
      // console.log(req.params.email);
      const email = req.params.email;

      const query = {email: email}
      const result = await foodCollection.find(query).toArray();
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


    app.get('/purchase',logger, async (req, res) => {
      const cursor = foodPurchaseCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })
    
    app.get('/purchase/:email',verifyToken,logger, async (req, res) => {
      // console.log(req.params.email);
      console.log('token owner info',req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await foodPurchaseCollection.find({ buyerEmail: req.params.email }).toArray();
      res.send(result);
    })

    // top selling foods

    app.get('/purchases', async (req, res) => {
      const result = await foodPurchaseCollection.find().sort({ purchaseQuantity: -1 }).limit(6).toArray();
      res.send(result)
    });

    app.patch('/food/:id', async (req, res) => {
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
      const query = { _id: new ObjectId(id) }
      const result = await foodPurchaseCollection.deleteOne(query)
      res.send(result)
    })


    // Search foods by name
    app.get('/search', async (req, res) => {
      const foodName = req.query.foodName;

      try {
        const cursor = foodCollection.find({ foodName: { $regex: foodName, $options: 'i' } });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error('Error searching foods:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    // purchase count
    // app.post('/purchase', async (req, res) => {
    //   const purchase = req.body;
      
    //   try {
    //     // Insert the purchase record
    //     const result = await foodPurchaseCollection.insertOne(purchase);
        
    //     // Update the order count for the purchased food item
    //     const filter = { _id: new ObjectId(purchase.foodId) };
    //     const update = { $inc: { orderCount: 1 } };
    //     await foodCollection.updateOne(filter, update);
        
    //     res.send(result);
    //   } catch (error) {
    //     console.error("Error purchasing food:", error);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // });


    


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