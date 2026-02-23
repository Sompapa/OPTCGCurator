const express = require('express');
const { initDB } = require('./database/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

let db;
async function startServer() {
    db = await initDB();
    app.use((req, res, next) => {
        req.db = db;
        next(); 
    });

    app.use('/api', apiRoutes);

    app.listen(PORT, () => {
        console.log(`\nSuccess! The server is running at http://localhost:${PORT}`);
        console.log(`Check it here: http://localhost:${PORT}`);
    });
}

startServer();