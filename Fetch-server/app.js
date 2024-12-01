const express = require("express");
const http = require('http');
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const morgan = require("morgan");
const propertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());

// Database configuration
const propertiesPath = path.resolve(__dirname, "conf/db.conf");
const properties = propertiesReader(propertiesPath);
const dbPprefix = properties.get("db.prefix");
const dbUsername = encodeURIComponent(properties.get("db.user"));
const dbPwd = encodeURIComponent(properties.get("db.pwd"));
const dbName = properties.get("db.dbName");
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db;

const port = process.env.PORT || 3000; // Use Render's 
client.connect()
    .then(() => {
        db = client.db(dbName);
        console.log("Connected to MongoDB");

        // Start the server
        http.createServer(app).listen(3000, function() {
            console.log("App started on port 3000");
        });
    })
    .catch(err => {
        console.error("Failed to connect to MongoDB", err);
    });

// Static file serving and logging
app.use(morgan("short"));

// Route to get all documents from a collection
app.get('/collection/:collectionName', async (req, res, next) => {
    const { collectionName } = req.params;
    try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        res.json(documents);
    } catch (err) {
        next(err);
    }
});

// Route to get a specific document by ID from a collection
app.get('/collection/:collectionName/:id', async (req, res, next) => {
    const { collectionName, id } = req.params;

    // Validate the ID format
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
        const collection = db.collection(collectionName);
        const document = await collection.findOne({ _id: new ObjectId(id) });

        if (!document) {
            return res.status(404).send({ error: 'Document not found' });
        }

        res.json(document);
    } catch (err) {
        next(err);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'An internal server error occurred' });
});



// Route to add a new lesson
app.post('/collection/:collectionName', async (req, res, next) => {
    const { collectionName } = req.params;
    const newDocument = req.body;

    try {
        const collection = db.collection(collectionName);
        const result = await collection.insertOne(newDocument);
        res.status(201).send({ message: 'Document created successfully', documentId: result.insertedId });
    } catch (err) {
        next(err);
    }
});


app.put('/collection/:collectionName/:id', async (req, res, next) => {
    const { collectionName, id } = req.params;
    const updatedDocument = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
        const collection = db.collection(collectionName);
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedDocument }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Document not found' });
        }
        res.send({ message: 'Document updated successfully' });
    } catch (err) {
        next(err);
    }
});

// Route to delete a specific document by ID from a collection
app.delete('/collection/:collectionName/:id', async (req, res, next) => {
    const { collectionName, id } = req.params;

    // Validate the ID format
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
    }

    try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Document not found or already deleted' });
        }

        res.status(200).send({ message: 'Document deleted successfully' });
    } catch (err) {
        next(err);
    }
});


// Handle missing routes
app.use(function(req, res) {
    res.status(404).json({ message: "Operation not available" });
});

