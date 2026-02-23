const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

let db;
(async () => {
    // Open table
    db = await open({
        filename: './collection.db',
        driver: sqlite3.Database
    });

    // Create table if not exits already
    await db.exec(`
        CREATE TABLE IF NOT EXISTS my_collection (
            card_id TEXT PRIMARY KEY,
            card_name TEXT,
            image_url TEXT,
            quantity INTEGER DEFAULT 0
        )
    `);
    console.log("Database is ready: collection.db");
})();

app.get('/api/all-sources', async (req, res) => {
    console.log("Requesting Data...");

    // Helper for safe request
    const safeGet = async (url) => {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (e) {
            console.warn(`Warning: ${url} not available (404). Countinue with an empty list.`);
            return []; 
        }
    };

    const mainSets = await safeGet('https://optcgapi.com/api/allSets/');
    const starterDecks = await safeGet('https://optcgapi.com/api/allDecks/');
    const promoCards = await safeGet('https://optcgapi.com/api/allPromoCards/');

    res.json({
        mainSets,
        starterDecks,
        promoCards,
        totalCount: mainSets.length + starterDecks.length + promoCards.length
    });
});

//Sorter
app.get('/api/view/:id', async (req, res) => {
    const id = req.params.id.trim().toUpperCase();
    
    try {
        let url;
        // Logic: if starts with st_ /decks/ endpoint else /sets/
        if (id.toUpperCase().startsWith('ST')) {
            url = `https://www.optcgapi.com/api/decks/${id}/`;
        } else {
            url = `https://www.optcgapi.com/api/sets/${id}/`;
        }

        console.log(`Fetching cards from: ${url}`);
        const response = await axios.get(url);
		
		if (!response.data || response.data.length === 0) {
			return res.status(404).json({error: "The list is empty or can not be found."});
		}
		
        res.json(response.data);

	} catch (error) {
        console.error(`Error (${id}):`, error.response ? error.response.status : error.message);
        res.status(error.response ? error.response.status : 500).json({ 
            error: "Error accured during card fetch.",
            details: error.message,
            attemptedUrl: url
        });
    }
});

//Tester
/*app.get('/api/all-sources', async (req, res) => {
    const results = { mainSets: [], starterDecks: [], promoCards: [] };
    
    try {
        // 1. Próba: Main Sets
        console.log("Testing Sets...");
        const s = await axios.get('https://optcgapi.com/api/allSets/');
        results.mainSets = s.data;

        // 2. Próba: Decks
        console.log("Testing Decks...");
        const d = await axios.get('https://optcgapi.com/api/allDecks/');
        results.starterDecks = d.data;

        // 3. Próba: Promos (Gyanúsított)
        console.log("Testing Promos...");
        const p = await axios.get('https://optcgapi.com/api/allPromoCards/');
        results.promoCards = p.data;

        res.json(results);
    } catch (error) {
        // Itt pontosan kiírja, melyik hívásnál halt meg
        console.error("Hiba történt itt:", error.config.url);
        console.error("Státusz kód:", error.response ? error.response.status : "Hálózat hiba");
        
        res.status(500).json({ 
            error: "Hiba az API elérésekor", 
            failedUrl: error.config.url 
        });
    }
});*/

app.post('/api/collection/add' , async (req, res) => {
    const { card_id, card_name, image_url } = req.body;
    try {
        //Check if card is there
        const existing = await db.get('SELECT * FROM my_collection WHERE card_id =?', [card_id]);

        if(existing) {
            await db.run('UPDATE my_collection SET quantity = quantity +1 WHERE card_id = ?', [card_id]);
        } else {
            await db.run(
                'INSERT INTO my_collection (card_id, card_name, image_url, quantity) VALUES (?, ?, ?, 1)',
                [card_id, card_name, image_url]
            );
        }
        res.json({success: true, message: "Card added to collection!" });
    } catch (error) {    
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\nSuccess! The server is running at http://localhost:${PORT}`);
    console.log(`Check it here: http://localhost:${PORT}`);
});