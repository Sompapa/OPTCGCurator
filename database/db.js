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

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_name TEXT NOT NULL,
            leader_id TEXT NOT NULL,
            leader_name TEXT,
            leader_image TEXT,
            leader_color TEXT
        )
    `);

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS deck_cards (
            deck_id INTEGER,
            card_id TEXT,
            card_name TEXT,
            image_url TEXT,
            card_color TEXT,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY(deck_id) REFERENCES decks(id)
        )
    `);
    
    console.log("Database is ready: collection.db (with Decks support!)");
    return dbInstance;
}

module.exports = { initDB };