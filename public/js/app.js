const setIdMap = {};
let myCollectionMap = {};
function handleDropdownSelect(selectedValue, otherInputId) {
  const setId = setIdMap[selectedValue];
  if (setId) {
    document.getElementById(otherInputId).value = "";

    loadSetCards(setId);
  }
}

async function loadSources() {
  try {
    console.log("Leading sources...");
    const response = await fetch("/api/all-sources");
    if (!response.ok) throw new Error("API error!");

    const data = await response.json();

    const mainList = document.getElementById("main-sets-list");
    const starterList = document.getElementById("starter-decks-list");

    if (data.mainSets) {
      data.mainSets.forEach((set) => {
        const displayName = `${set.set_name} (${set.set_id})`;
        setIdMap[displayName] = set.set_id;

        const option = document.createElement("option");
        option.value = displayName;
        mainList.appendChild(option);
      });
    }

    if (data.starterDecks) {
      data.starterDecks.forEach((deck) => {
        const displayName = `${deck.structure_deck_name} (${deck.structure_deck_id})`;
        setIdMap[displayName] = deck.structure_deck_id;

        const option = document.createElement("option");
        option.value = displayName;
        starterList.appendChild(option);
      });
    }
  } catch (e) {
    console.error("Error during load:", e);
    alert("Error during data fetch. Check the server!");
  }
}

//Show Cards
async function loadSetCards(id) {
  document.getElementById("homeBtn").style.display = "block";
  const display = document.getElementById("cards-display");
  const title = document.getElementById("current-set-title");
  const searchContainer = document.getElementById("search-container");
  const searchInput = document.getElementById("searchInput");

  title.innerText = "Loading cards: " + id;
  display.innerHTML = "Searching for cards...";
  searchContainer.style.display = "none";

  try {
    const response = await fetch(`/api/view/${id}`);
    const data = await response.json();
    display.innerHTML = "";

    let cardList = Array.isArray(data) ? data : data.cards || [];
    //With name and numbering formating
    cardList.forEach((card) => {
      const div = document.createElement("div");
      div.className = "card-box";

      let rawName = card.card_name || card.name || "Unknown";
      const img = card.card_image || card.image_url || card.image || "";
      let cardNumber = card.card_number || card.card_id || card.id || "";

      const cleanId = id
        .replace(/^(OP|ST|EB|PRB)-(\d+)/i, "$1$2")
        .toUpperCase();

      const idMatch = rawName.match(/\(([^)]*\d[^)]*)\)/);
      if (idMatch && !cardNumber) {
        cardNumber = idMatch[1];
      }

      let cleanName = rawName.replace(/\s*\([^)]*\d[^)]*\)/g, "").trim();

      if (!cardNumber && img.includes("/")) {
        const filename = img.split("/").pop();
        cardNumber = filename.split(".")[0];
      }

      if (!cardNumber) cardNumber = "N/A";

      //Cleaning serialnumbers
      if (cardNumber !== "N/A") {
        cardNumber = cardNumber.split("_")[0].toUpperCase();

        cardNumber = cardNumber.replace(/^(OP|ST|EB|PRB)-(\d+)/i, "$1$2");

        if (!cardNumber.includes(cleanId)) {
          cardNumber = `${cleanId}-${cardNumber.replace(/^-/, "")}`;
        }
      }

      const cardBackImg =
        "https://world.onepiece-cardgame.com/images/common/cardback.png";

      div.innerHTML = `
                <img class="card-img" 
                     src="${img ? img : cardBackImg}" 
                     alt="${cleanName}" 
                     onerror="this.onerror=null; this.src='${cardBackImg}';">
                <div class="card-info">
                    <strong>${cardNumber}</strong><br>
                    <span>${cleanName}</span>
                </div>
                <button class="add-btn" onclick="addToCollection('${cardNumber}', '${cleanName.replace(/'/g, "\\'")}', '${img ? img : cardBackImg}')">
                    + Add to Collection
                </button>
            `;
      display.appendChild(div);
    });
    title.innerText = id + " Cards (" + cardList.length + ")";

    if (cardList.length > 0) {
      searchInput.value = "";
      searchContainer.style.display = "block";

      setTimeout(() => {
        document.getElementById("sortSelect").value = "id_asc";
        sortCards();
      }, 50);
    } else {
      display.innerHTML = "Card can not be found.";
    }
  } catch (e) {
    console.error("Error:", e);
    display.innerHTML = "Error loading cards.";
  }
}

//Collection adder
async function addToCollection(id, name, img) {
  try {
    const response = await fetch("/api/collection/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: id,
        card_name: name,
        image_url: img,
      }),
    });
    const result = await response.json();
    if (result.success) alert("Card is added to the collection!");
  } catch (e) {
    alert("Error during save!");
  }
}

async function removeFromCollection(id) {
  try {
    //Save the position of the page
    const scrollPosition = window.scrollY;

    const response = await fetch("/api/collection/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: id }),
    });
    const result = await response.json();

    if (result.success) {
      await loadMyCollection();
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 10);
    }
  } catch (e) {
    alert("Error during the delete!");
  }
}

//My Collection
async function loadMyCollection() {
  document.getElementById("homeBtn").style.display = "block";
  const display = document.getElementById("cards-display");
  const title = document.getElementById("current-set-title");
  const searchContainer = document.getElementById("search-container");
  const searchInput = document.getElementById("searchInput");

  title.innerText = "Loading My Collection...";
  display.innerHTML = "Reading database...";
  searchContainer.style.display = "none";

  try {
    const response = await fetch("/api/collection/view");
    const myCards = await response.json();
    display.innerHTML = "";

    if (myCards.length === 0) {
      display.innerHTML =
        "<p style='text-align:center; width: 100%; font-size: 18px;'>Your collection is empty, search for crads to add them!</p>";
      title.innerText = "My Collection (0)";
      return;
    }

    myCards.forEach((card) => {
      const div = document.createElement("div");
      div.className = "card-box";

      const cardNumber = card.card_id;
      const cleanName = card.card_name;
      const img = card.image_url;
      const quantity = card.quantity;

      div.innerHTML = `
                    <img class="card-img" 
                         src="${img}" 
                         alt="${cleanName}" 
                         onerror="this.src='https://world.onepiece-cardgame.com/images/common/cardback.png';">
                    <div class="card-info">
                        <strong>${cardNumber}</strong><br>
                        <span>${cleanName}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; width: 100%; gap: 5px;">
                        <div style="background: #f39c12; color: white; padding: 8px; border-radius: 5px; font-weight: bold; flex-grow: 1; text-align: center;">
                            Owned: ${quantity}x
                        </div>
                        <button onclick="removeFromCollection('${cardNumber}')" 
                                style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s;"
                                onmouseover="this.style.background='#c0392b'" 
                                onmouseout="this.style.background='#e74c3c'">
                            -1
                        </button>
                    </div>
                `;
      display.appendChild(div);
    });

    title.innerText = "My Collection (" + myCards.length + " unique cards)";
    searchInput.value = "";
    searchContainer.style.display = "block";
    setTimeout(() => {
      document.getElementById("sortSelect").value = "id_asc";
      sortCards();
    }, 50);
  } catch (e) {
    console.error("Error:", e);
    display.innerHTML = "Error loading collection.";
  }
}

//Filter & Sort
function filterCards() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const cards = document.querySelectorAll(".card-box");

  cards.forEach((card) => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "flex" : "none";
  });
}

function sortCards() {
  const display = document.getElementById("cards-display");
  const cards = Array.from(display.getElementsByClassName("card-box"));
  const sortMode = document.getElementById("sortSelect").value;

  cards.sort((a, b) => {
    const idA = a.querySelector(".card-info strong")?.innerText || "";
    const idB = b.querySelector(".card-info strong")?.innerText || "";
    const nameA = a.querySelector(".card-info span")?.innerText || "";
    const nameB = b.querySelector(".card-info span")?.innerText || "";

    if (sortMode === "id_asc") {
      return idA.localeCompare(idB, undefined, { numeric: true });
    } else if (sortMode === "id_desc") {
      return idB.localeCompare(idA, undefined, { numeric: true });
    } else if (sortMode === "name_asc") {
      return nameA.localeCompare(nameB);
    } else if (sortMode === "name_desc") {
      return nameB.localeCompare(nameA);
    }
  });

  cards.forEach((card) => display.appendChild(card));
}

async function openDeckbuilder() {
  document.getElementById("homeBtn").style.display = "block";
  document.getElementById("cards-display").style.display = "none";
  document.getElementById("current-set-title").style.display = "none";

  const dbContainer = document.getElementById("deckbuilder-container");
  dbContainer.style.display = "block";
  try {
    const response = await fetch("/api/collection/check");
    myCollectionMap = await response.json();
    console.log("Gyűjtemény betöltve az ellenőrzéshez:", myCollectionMap);
    const dbDisplay = document.getElementById("db-cards-display");
    if (dbDisplay.innerHTML.trim() === "") {
      loadCardsForDeckbuilder("OP-01");
    }
  } catch (e) {
    console.error("Hiba a gyűjtemény ellenőrzésekor:", e);
  }
}

async function loadCardsForDeckbuilder(setId) {
  currentDbSet = setId; // Megjegyezzük, melyik szettben vagyunk
  const display = document.getElementById("db-cards-display");
  const titleText = document.querySelector(".db-left-panel h3"); // A bal panel címe

  display.innerHTML =
    '<p style="text-align:center; width:100%;">Kártyák betöltése...</p>';

  try {
    const response = await fetch(`/api/view/${setId}`);
    const data = await response.json();
    display.innerHTML = "";

    let cardList = Array.isArray(data) ? data : data.cards || [];

    // --- 1. LOGIKA: Csak Leaderek mutatása, ha még nincs kiválasztva ---
    if (!currentLeader) {
      // Szűrjük azokat a lapokat, amiknek a kategóriája "Leader" (vagy a ritkasága "L")
      cardList = cardList.filter(
        (c) => c.card_category === "Leader" || c.card_category === "L",
      );
      titleText.innerText = "👑 Válassz egy Leadert!";
      titleText.style.color = "#e67e22";
    } else {
      // Ha már van Leaderünk, elrejtjük a Leadereket a listából, és mutatjuk a többit!
      cardList = cardList.filter(
        (c) => c.card_category !== "Leader" && c.card_category !== "L",
      );
      titleText.innerText = "🃏 Available Cards";
      titleText.style.color = "#2c3e50";
    }

    cardList.forEach((card) => {
      const div = document.createElement("div");
      div.className = "card-box";

      const cardNumber = card.card_id || "N/A";
      const cleanName = card.card_name || "Unknown";
      const category = card.card_category || "Unknown";
      const color = card.card_color || ""; // A szín a következő lépésben lesz fontos!

      let img = card.image_url || "";
      if (img && !img.startsWith("http")) {
        img = "https://en.onepiece-cardgame.com" + img;
      }
      const cardBackImg =
        "https://world.onepiece-cardgame.com/images/common/cardback.png";

      const isOwned =
        myCollectionMap[cardNumber] && myCollectionMap[cardNumber] > 0;
      const badgeHTML = isOwned
        ? `<div class="ownership-badge owned-yes">✔</div>`
        : `<div class="ownership-badge owned-no">✖</div>`;

      div.innerHTML = `
                ${badgeHTML}
                <img class="card-img" src="${img ? img : cardBackImg}" alt="${cleanName}" onerror="this.src='${cardBackImg}';">
                <div class="card-info" style="font-size: 0.8em;">
                    <strong>${cardNumber}</strong><br>
                    <span>${cleanName}</span>
                </div>
                <button onclick="addToDeck('${cardNumber}', '${img}', '${category}', '${color}')" 
                        style="background: #2c3e50; color: white; border: none; padding: 5px; width: 100%; border-radius: 5px; margin-top: 5px; cursor: pointer;">
                    Kiválaszt
                </button>
            `;
      display.appendChild(div);
    });
  } catch (e) {
    display.innerHTML = "Hiba a kártyák betöltésekor.";
  }
}

function goHome() {
  // 1. Home gomb elrejtése
  document.getElementById("homeBtn").style.display = "none";

  // 2. Keresőmezők ürítése
  document.getElementById("mainSetInput").value = "";
  document.getElementById("starterDeckInput").value = "";

  // 3. Pakliépítő elrejtése (ha létezik)
  const dbContainer = document.getElementById("deckbuilder-container");
  if (dbContainer) dbContainer.style.display = "none";

  // 4. Alapnézet visszaállítása
  document.getElementById("search-container").style.display = "none";
  document.getElementById("current-set-title").innerText = "Choose a set!";
  document.getElementById("current-set-title").style.display = "block";
  document.getElementById("cards-display").innerHTML = "";
  document.getElementById("cards-display").style.display = "grid";
}

// --- Deckbuilder states ---
let currentDeckCards = {}; //Tárolja a pakliban lévő kártyákat: { "OP13-079": { id: "OP13-079", count: 4, img: "..." } }
let currentLeader = null; //Tárolja a kiválasztott Leadert
let currentDbSet = ""; //Tárolja az éppen nézett szettet

//A TopDecks importáló függvény
function importTopDecks() {
  const inputStr = document.getElementById("importInput").value.trim();
  if (!inputStr) return;

  try {
    const parsedArray = JSON.parse(inputStr);
    if (!Array.isArray(parsedArray)) throw new Error("Nem érvényes tömb!");

    //Pakli lenullázása az új import előtt
    currentDeckCards = {};

    parsedArray.forEach((item) => {
      //Kihagyjuk a metaadat szöveget
      if (item.includes("Exported from")) return;

      const cardId = item.toUpperCase().trim();

      //Ha még nincs a pakliban, létrehozzuk. (Trükk: a hivatalos kép URL kiszámítása)
      if (!currentDeckCards[cardId]) {
        currentDeckCards[cardId] = {
          id: cardId,
          count: 1,
          img: `https://en.onepiece-cardgame.com/images/cardlist/card/${cardId}.png`,
        };
      } else {
        //Ha már benne van, csak növeljük a darabszámot
        currentDeckCards[cardId].count += 1;
      }
    });

    //Pakli kirajzolása és beviteli mező ürítése
    renderDeck();
    document.getElementById("importInput").value = "";
  } catch (e) {
    alert(
      "Hiba az importálás során! Kérlek ellenőrizd, hogy a teljes JSON tömböt másoltad-e be (a szögletes zárójelekkel együtt).",
    );
    console.error(e);
  }
}

// 2. A Pakli kirajzoló függvény
function renderDeck() {
  const list = document.getElementById("deck-list");
  list.innerHTML = "";

  let totalMainDeck = 0;

  for (const [id, card] of Object.entries(currentDeckCards)) {
    totalMainDeck += card.count;

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.background = "#f1f2f6";
    div.style.padding = "6px 10px";
    div.style.marginBottom = "6px";
    div.style.borderRadius = "6px";
    div.style.borderLeft = "4px solid #3498db";

    // ELLENŐRZÉS: Megvan-e a kártya a gyűjteményedben (myCollectionMap)?
    // Ha kevesebb van a gyűjteményben, mint amennyit a pakli kér, PIROS lesz!
    const ownedQuantity = myCollectionMap[id] || 0;
    const isFullyOwned = ownedQuantity >= card.count;
    const idColor = isFullyOwned ? "#27ae60" : "#e74c3c"; // Zöld, ha megvan, Piros, ha hiányzik

    div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${card.img}" style="width:35px; border-radius:4px;" onerror="this.src='https://world.onepiece-cardgame.com/images/common/cardback.png'">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight:bold; color:${idColor}; font-size: 14px;">${id}</span>
                    <span style="font-size: 10px; color: #7f8c8d;">Owned: ${ownedQuantity}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-weight:bold; font-size: 16px;">x${card.count}</span>
                <button onclick="removeFromDeck('${id}')" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding: 4px 8px; cursor:pointer; font-weight: bold;">-</button>
            </div>
        `;
    list.appendChild(div);
  }

  // Számláló frissítése (A TopDecks export általában 51 lapos: 50 main + 1 Leader)
  document.getElementById("deck-count").innerText = `${totalMainDeck} lap`;
}

// 3. Kártya eltávolítása a pakliból
function removeFromDeck(id) {
  if (currentDeckCards[id]) {
    currentDeckCards[id].count -= 1;
    if (currentDeckCards[id].count <= 0) {
      delete currentDeckCards[id];
    }
    renderDeck();
  }
}

// --- Kártya hozzáadása a paklihoz (Leader vagy Sima lap) ---
    function addToDeck(id, img, category, color) {
        // Biztonságos kisbetűs ellenőrzés a kategóriára
        const cat = (category || "").toLowerCase();
        
        // 1. ESET: Ha egy Leadert választottunk ki
        if (cat.includes("leader") || cat === "l") {
            currentLeader = { id, img, color };
            
            // Frissítjük a jobb oldali Leader dobozt a menő kinézettel
            const leaderSlot = document.getElementById('leader-slot');
            leaderSlot.innerHTML = `
                <div style="display:flex; align-items:center; gap: 15px; padding: 10px; height: 100%; box-sizing: border-box;">
                    <img src="${img}" style="height: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    <div style="flex-grow: 1; text-align: left;">
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">Leader</h4>
                        <span style="font-weight: bold; color: #e74c3c; font-size: 14px;">${id}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d; display: inline-block; margin-top: 4px; padding: 2px 6px; background: #eee; border-radius: 4px;">Szín: ${color}</span>
                    </div>
                    <button onclick="removeLeader()" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">Csere</button>
                </div>
            `;
            leaderSlot.style.border = "2px solid #3498db";
            leaderSlot.style.background = "#ebf5fb";

            // Újratöltjük a bal oldalt (Most már nem Leadereket fog mutatni, hanem a többi lapot!)
            if (currentDbSet) loadCardsForDeckbuilder(currentDbSet);
            return;
        }

        // 2. ESET: Ha sima lapot akarunk betenni, de még nincs Leader
        if (!currentLeader) {
            alert("Először válassz egy Leadert!");
            return;
        }

        // --- IDE JÖN MAJD A SZÍN ELLENŐRZÉS! ---

        // 3. ESET: Sima lap hozzáadása a paklihoz (Max 4 szabály)
        if (!currentDeckCards[id]) {
            currentDeckCards[id] = { id: id, count: 1, img: img };
        } else {
            if (currentDeckCards[id].count >= 4) {
                alert("Egy lapból maximum 4 darab lehet a pakliban!");
                return;
            }
            currentDeckCards[id].count += 1;
        }

        renderDeck();
    }

// --- Leader eltávolítása (Csere gomb) ---
function removeLeader() {
    currentLeader = null;
    
    // Visszaállítjuk a jobb oldali dobozt alapállapotba
    const leaderSlot = document.getElementById('leader-slot');
    leaderSlot.innerHTML = '<p style="color: #7f8c8d; text-align: center; margin-top: 40px;">Choose a Leader!</p>';
    leaderSlot.style.border = "2px dashed #95a5a6";
    leaderSlot.style.background = "#fdfdfd";

    // Újratöltjük a bal oldalt (Hogy ismét a Leadereket mutassa)
    if (currentDbSet) loadCardsForDeckbuilder(currentDbSet);
}

window.onload = loadSources;
