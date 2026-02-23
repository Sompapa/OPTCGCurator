const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbInstance = null;

async function initDB() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: './collection.db',
        driver: sqlite3.Database
    });

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS my_collection (
            card_id TEXT PRIMARY KEY,
            card_name TEXT,
            image_url TEXT,
            quantity INTEGER DEFAULT 0
        )
    `);
    
    console.log("Database is ready: collection.db");
    return dbInstance;
}

module.exports = { initDB };