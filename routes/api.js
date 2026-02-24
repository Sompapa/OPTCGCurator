const express = require("express");
const axios = require("axios");
const router = express.Router();

// Fetch sources
router.get("/all-sources", async (req, res) => {
  console.log("Requesting Data...");
  const safeGet = async (url) => {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (e) {
      console.warn(
        `Warning: ${url} not available (404). Continue with an empty list.`,
      );
      return [];
    }
  };

  const mainSets = await safeGet("https://optcgapi.com/api/allSets/");
  const starterDecks = await safeGet("https://optcgapi.com/api/allDecks/");
  const promoCards = await safeGet("https://optcgapi.com/api/allPromoCards/");

  res.json({
    mainSets,
    starterDecks,
    promoCards,
    totalCount: mainSets.length + starterDecks.length + promoCards.length,
  });
});

// Cards for a set
router.get("/view/:id", async (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  try {
    let url = id.startsWith("ST")
      ? `https://www.optcgapi.com/api/decks/${id}/`
      : `https://www.optcgapi.com/api/sets/${id}/`;

    console.log(`Fetching cards from: ${url}`);
    const response = await axios.get(url);

    if (!response.data || response.data.length === 0) {
      return res
        .status(404)
        .json({ error: "The list is empty or can not be found." });
    }
    res.json(response.data);
  } catch (error) {
    console.error(
      `Error (${id}):`,
      error.response ? error.response.status : error.message,
    );
    res
      .status(error.response ? error.response.status : 500)
      .json({ error: "Error occurred during card fetch." });
  }
});

// Save to database
router.post("/collection/add", async (req, res) => {
  const { card_id, card_name, image_url } = req.body;
  try {
    const existing = await req.db.get(
      "SELECT * FROM my_collection WHERE card_id =?",
      [card_id],
    );

    if (existing) {
      await req.db.run(
        "UPDATE my_collection SET quantity = quantity +1 WHERE card_id = ?",
        [card_id],
      );
    } else {
      await req.db.run(
        "INSERT INTO my_collection (card_id, card_name, image_url, quantity) VALUES (?, ?, ?, 1)",
        [card_id, card_name, image_url],
      );
    }
    res.json({ success: true, message: "Card added to collection!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/collection/view', async (req, res) => {
    try{
        const myCard = await req.db.all('SELECT * FROM my_collection ORDER BY card_id ASC');
        res.json(myCard);
    } catch (error) {
        console.error("Datadbase error:", error);
        res.status(500).json({ error: "Error during loading the collection."});
    }
});

router.post('/collection/remove', async (req, res) => {
  const { card_id } = req.body;
  try{
    const existing = await req.db.get("SELECT * FROM my_collection WHERE card_id = ?", [card_id]);

    if (existing) {
      if (existing.quantity > 1) {
        //if there is more than 1 just remove 1
        await req.db.run("UPDATE my_collection SET quantity = quantity - 1 WHERE card_id = ?", [card_id]);
      } else {
        await req.db.run("DELETE FROM my_collection WHERE card_id = ?", [card_id]);
      }
      res.json({ success: true, message: "Card removed"});
    } else {
      res.status(404).json({ error: "Card not found in collection."});
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({error: "Error during removal."});
  }
});

router.get('/collection/check', async (req, res) => {
  try{
    const myCards = await req.db.all('SELECT card_id, quantity FROM my_collection');

    const collectionMap = {};
    myCards.forEach(card => {
      collectionMap[card.card_id] = card.quantity;
    });

    res.json(collectionMap);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error while checking collection."});
  }
});

module.exports = router;
