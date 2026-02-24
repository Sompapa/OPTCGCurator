  const setIdMap = {};
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
            data.mainSets.forEach(set => {
              const displayName = `${set.set_name} (${set.set_id})`;
              setIdMap[displayName] = set.set_id;
              
              const option = document.createElement("option");
              option.value = displayName;
              mainList.appendChild(option);
            });
          }

          if (data.starterDecks) {
            data.starterDecks.forEach(deck => {
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

    // 3. Show Cards
    async function loadSetCards(id) {
      const display = document.getElementById('cards-display');
      const title = document.getElementById('current-set-title');
      const searchContainer = document.getElementById('search-container');
      const searchInput = document.getElementById('searchInput');

      title.innerText = "Loading cards: " + id;
      display.innerHTML = 'Searching for cards...';
      searchContainer.style.display = "none";

      try {
        const response = await fetch(`/api/view/${id}`);
        const data = await response.json();
        display.innerHTML = '';

        let cardList = Array.isArray(data) ? data : (data.cards || []);
        //With name and numbering formating
        cardList.forEach(card => {
          const div = document.createElement('div');
          div.className = 'card-box';

          let rawName = card.card_name || card.name || "Unknown";
          const img = card.card_image || card.image_url || card.image || "";
          let cardNumber = card.card_number || card.card_id || card.id || "";

          const cleanId = id.replace(/^(OP|ST|EB|PRB)-(\d+)/i, '$1$2').toUpperCase();

          const idMatch = rawName.match(/\(([^)]*\d[^)]*)\)/);
          if (idMatch && !cardNumber) {
            cardNumber = idMatch[1];
          }

          let cleanName = rawName.replace(/\s*\([^)]*\d[^)]*\)/g, '').trim();

          if (!cardNumber && img.includes('/')) {
            const filename = img.split('/').pop();
            cardNumber = filename.split('.')[0];
          }

          if (!cardNumber) cardNumber = "N/A";

          // Cleaning serialnumbers
          if (cardNumber !== "N/A") {
            cardNumber = cardNumber.split('_')[0].toUpperCase();

            cardNumber = cardNumber.replace(/^(OP|ST|EB|PRB)-(\d+)/i, '$1$2');

            if (!cardNumber.includes(cleanId)) {
              cardNumber = `${cleanId}-${cardNumber.replace(/^-/, '')}`;
            }
          }

          const cardBackImg = "https://world.onepiece-cardgame.com/images/common/cardback.png";

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
            document.getElementById('sortSelect').value = 'id_asc';
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

    // 4. Collection adder
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
            const response = await fetch("/api/collection/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ card_id: id }),
            });
            const result = await response.json();
            
            if (result.success) {
                // Refresh after remval
                loadMyCollection();
            }
        } catch (e) {
            alert("Error during the delet!");
        }
    }

    // 5. My Collection
      async function loadMyCollection() {
        const display = document.getElementById('cards-display');
        const title = document.getElementById('current-set-title');
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('searchInput');

        title.innerText = "Loading My Collection...";
        display.innerHTML = 'Reading database...';
        searchContainer.style.display = "none";

        try {
            const response = await fetch("/api/collection/view");
            const myCards = await response.json();
            display.innerHTML = '';

            if (myCards.length === 0) {
                display.innerHTML = "<p style='text-align:center; width: 100%; font-size: 18px;'>Your collection is empty, search for crads to add them!</p>";
                title.innerText = "My Collection (0)";
                return;
            }

            myCards.forEach(card => {
                const div = document.createElement('div');
                div.className = 'card-box';

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
                document.getElementById('sortSelect').value = 'id_asc';
                sortCards();
            }, 50);

        } catch (e) {
            console.error("Error:", e);
            display.innerHTML = "Error loading collection.";
        }
      }

    // 5. Filter & Sort
    function filterCards() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.card-box');

      cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "flex" : "none";
      });
    }

    function sortCards() {
      const display = document.getElementById('cards-display');
      const cards = Array.from(display.getElementsByClassName('card-box'));
      const sortMode = document.getElementById('sortSelect').value;

      cards.sort((a, b) => {

        const idA = a.querySelector('.card-info strong')?.innerText || "";
        const idB = b.querySelector('.card-info strong')?.innerText || "";
        const nameA = a.querySelector('.card-info span')?.innerText || "";
        const nameB = b.querySelector('.card-info span')?.innerText || "";

        if (sortMode === 'id_asc') {
          return idA.localeCompare(idB, undefined, { numeric: true });
        } else if (sortMode === 'id_desc') {
          return idB.localeCompare(idA, undefined, { numeric: true });
        } else if (sortMode === 'name_asc') {
          return nameA.localeCompare(nameB);
        } else if (sortMode === 'name_desc') {
          return nameB.localeCompare(nameA);
        }
      });


      cards.forEach(card => display.appendChild(card));
    }

    window.onload = loadSources;