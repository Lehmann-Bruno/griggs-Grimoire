// ==== GLOBAL STATE ====
let spells = [];
let preparedSpells = JSON.parse(localStorage.getItem("preparedSpells") || "[]");
let specialistSpells = JSON.parse(localStorage.getItem("specialistSpells") || "[]");// how many you can PREPARE per level
const spellSlots = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// how many SPECIALIST per level
const specialistSlots = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// ==== HELPERS ====
function countPreparedByLevel(list) {
 const counts = {};
 list.forEach(name => {
 const spell = spells.find(s => s.name === name);
 const lvl = spell ? spell.level || 0 : 0;
 counts[lvl] = (counts[lvl] || 0) + 1;
 });
 return counts;
}

function showNavbar(pageId) {
  const spellNavbar = document.getElementById("spell-navbar");
  const characterNavbar = document.getElementById("character-navbar");

  // remove active class from both
  spellNavbar.classList.remove("navbar-active");
  characterNavbar.classList.remove("navbar-active");

  // add to the correct one
  if (pageId === "magic") {
    spellNavbar.classList.add("navbar-active");
  } else if (pageId === "character") {
    characterNavbar.classList.add("navbar-active");
  }
}

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show the selected page
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  // === ACTIVE NAV LINK ===
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`nav a[onclick*="${pageId}"]`);
  if (link) link.classList.add('active');

  // === SPECIAL PAGE ACTIONS ===
  if (pageId === 'cast') renderChecked();
}

// ==== CLEAR ALL PREPARED SPELLS ====
document.getElementById("clearAllButton").addEventListener("click", () => {
 // Custom in-page confirmation (since browser confirm() may be blocked)
 const btn = document.getElementById("clearAllButton");
 if (!btn.dataset.confirmed) {
 btn.textContent = "Click again to confirm!";
 btn.dataset.confirmed = "true";
 setTimeout(() => {
 btn.textContent = "Unprepare All Spells";
 btn.dataset.confirmed = "";
 }, 3000);
 return;
 }
 // If user clicks again within 3s → perform clear
 preparedSpells = [];
 specialistSpells = [];
 localStorage.setItem("preparedSpells", JSON.stringify(preparedSpells));
 localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));
 document.querySelectorAll('input[type="checkbox"][data-role="prepare"]').forEach(c => (c.checked = false));
 updateCounters();
 renderSpells(spells);
 btn.textContent = "All spells cleared!";
 btn.dataset.confirmed = "";
 setTimeout(() => (btn.textContent = "Unprepare All Spells"), 2000);
});
// ==== LOAD SPELLS ====
async function loadSpells() {
 try {
 const res = await fetch('spellData.json');
 if (!res.ok) throw new Error('Could not load spellData.json');
 const allData = await res.json();
 localStorage.setItem("allSpells", JSON.stringify(allData));
 const activeNames = JSON.parse(localStorage.getItem("activeSpells") || "[]");
 // If no selection saved yet, don't load everything automatically — show none
 if (activeNames.length === 0) {
 spells = [];
 document.getElementById('spells').textContent = "No spells selected. Click 'Manage Spells' to choose which spells to display.";
 } else {
 spells = allData.filter(s => activeNames.includes(s.name));
 renderSpells(spells);
 }
 } catch (err) {
 document.getElementById('spells').textContent = err.message;
 }
}
// ==== RENDER SPELLBOOK (main page) ====
// ==== RENDER SPELLBOOK (main page) ====
function renderSpells(list, filterText = "") {
  const container = document.getElementById("spells");
  container.innerHTML = "";

  const lowerFilter = filterText.toLowerCase();
  const filtered = list.filter(spell => {
    const all = Object.values(spell).join(" ").toLowerCase();
    return all.includes(lowerFilter);
  });

  if (filtered.length === 0) {
    container.textContent = "No spells found.";
    return;
  }

  // Group by level
  const grouped = {};
  filtered.forEach(spell => {
    const level = spell.level || "Unknown";
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(spell);
  });

  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(level => {
      const section = document.createElement("div");
      section.style.width = "100%";

      const title = document.createElement("h2");
      title.textContent = `Level ${level}`;

      const normalCounter = document.createElement("span");
      normalCounter.id = `counter-${level}`;
      normalCounter.className = "counter normal-counter";
      title.appendChild(normalCounter);

      const specialistCounter = document.createElement("span");
      specialistCounter.id = `special-counter-${level}`;
      specialistCounter.className = "counter special-counter";
      title.appendChild(specialistCounter);

      section.appendChild(title);

      const levelContainer = document.createElement("div");
      levelContainer.className = "level-section";
      section.appendChild(levelContainer);

      grouped[level].forEach((spell, index) => {
        const card = document.createElement("div");
        card.className = "spell-card";

        // Header button (spell name)
        const button = document.createElement("button");
        button.textContent = spell.name || `Spell ${index + 1}`;
        button.addEventListener("click", () => openSpell(card));
        card.appendChild(button);

        // Container for slot controls
        const checks = document.createElement("div");
        checks.className = "checkbox-group";

        // === NORMAL SLOT BUTTON (LEFT) ===
        const normalContainer = document.createElement("div");
        normalContainer.className = "normal-container";

        const normalCount = document.createElement("span");
        normalCount.className = "normal-count";
        normalCount.dataset.spell = spell.name;
        const currentNormalCount = preparedSpells.filter(s => s === spell.name).length;
        normalCount.textContent = `(${currentNormalCount})`;

        const normalBtn = document.createElement("button");
        normalBtn.textContent = "+";
        normalBtn.className = "add-normal-btn";
        normalBtn.title = "Add Normal Slot";
        normalBtn.dataset.spell = spell.name;
        normalBtn.dataset.level = level;
        normalBtn.addEventListener("click", () => {
          addNormalSpell(spell.name, level);
          updateNormalCountDisplay(spell.name);
        });

        const normalLabel = document.createElement("label");
        normalLabel.textContent = "Normal Slot";
        normalLabel.className = "normal-label";

        normalContainer.appendChild(normalCount);
        normalContainer.appendChild(normalBtn);
        normalContainer.appendChild(normalLabel);

        // === SPECIALIST SLOT BUTTON (RIGHT, OPTIONAL) ===
        const selectedSchool = (localStorage.getItem("specialistSchool") || "").toLowerCase();
        const spellSchool = (spell.school || spell.School || spell.magic_school || "").toLowerCase();

        let specContainer = null;
        if (selectedSchool && spellSchool.includes(selectedSchool)) {
          specContainer = document.createElement("div");
          specContainer.className = "specialist-container";

          const specCount = document.createElement("span");
          specCount.className = "specialist-count";
          specCount.dataset.spell = spell.name;
          const currentSpecCount = specialistSpells.filter(s => s === spell.name).length;
          specCount.textContent = `(${currentSpecCount})`;

          const specBtn = document.createElement("button");
          specBtn.textContent = "+";
          specBtn.className = "add-specialist-btn";
          specBtn.title = "Add Specialist Slot";
          specBtn.dataset.spell = spell.name;
          specBtn.dataset.level = level;
          specBtn.addEventListener("click", () => {
            addSpecialistSpell(spell.name, level);
            updateSpecialistCountDisplay(spell.name);
          });

          const specLabel = document.createElement("label");
          specLabel.textContent = "Specialist Slot";
          specLabel.className = "specialist-label";

          specContainer.appendChild(specCount);
          specContainer.appendChild(specBtn);
          specContainer.appendChild(specLabel);
        }

        // === FLEX WRAPPER: LEFT / RIGHT ALIGNMENT ===
        const slotWrapper = document.createElement("div");
        slotWrapper.className = "slot-wrapper";
        slotWrapper.appendChild(normalContainer);
        if (specContainer) slotWrapper.appendChild(specContainer);

        checks.appendChild(slotWrapper);
        card.appendChild(checks);

        // Spell details (description etc.)
        const content = document.createElement("div");
        content.className = "spell-content";

        for (const [key, value] of Object.entries(spell)) {
          if (key === "name") continue;
          if (!value) continue;
          const text = String(value);
          const p = document.createElement("p");
          p.textContent = `${key}: ${text}`;
          content.appendChild(p);
        }

        card.appendChild(content);
        levelContainer.appendChild(card);
      });

      container.appendChild(section);
    });

  updateCounters();
}

// ==== OPEN/CLOSE SPELL ====
function openSpell(card) {
 const content = card.querySelector('.spell-content');
 if (!content) return;
 const isOpen = content.style.display === "block";
 // Close all spell contents everywhere
 document.querySelectorAll('.spell-content').forEach(c => (c.style.display = "none"));
 // Toggle this one
 if (!isOpen) {
 content.style.display = "block";
 }
}
// ==== TOGGLE PREPARED ====
function togglePrepared(name, checked) {
 const spell = spells.find(s => s.name === name);
 const level = spell ? spell.level || 0 : 0;
 const currentCounts = countPreparedByLevel(preparedSpells);
 const current = currentCounts[level] || 0;
 let max = spellSlots[level] ?? 0;
 if (localStorage.getItem("specialistMode") === "high") {
 max = Math.max(0, max - 1);
 }
 if (checked) {
 if (current >= max) {
 alert(`You can only prepare ${max} spells of level ${level}.`);
 const checkbox = document.querySelector(`input[data-spell="${name}"][data-role="prepare"]`);
 if (checkbox) checkbox.checked = false;
 return;
 }
 preparedSpells.push(name);
 } else {
 preparedSpells = preparedSpells.filter(n => n !== name);
 }
 localStorage.setItem("preparedSpells", JSON.stringify(preparedSpells));
 updateCounters();
}
// ==== TOGGLE SPECIALIST ====
function addSpecialistSpell(name, level) {
 const lvl = Number(level);
 const selectedSchool = localStorage.getItem("specialistSchool") || "";
 const spell = spells.find(s => s.name === name);
 const spellSchool = (spell?.school || spell?.School || spell?.magic_school || "").toLowerCase();
 // Check if spell matches your specialization
 if (!selectedSchool || !spellSchool.includes(selectedSchool)) {
 alert(`You can only assign specialist slots to spells of your chosen school: ${selectedSchool || "none"}.`);
 return;
 }
 const currentCounts = countPreparedByLevel(specialistSpells);
 const current = currentCounts[lvl] || 0;
 const max = specialistSlots[lvl] ?? 0;
 if (current >= max) {
 alert(`You can only prepare ${max} specialist spells of level ${lvl}.`);
 return;
 }
 specialistSpells.push(name);
 localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));
 updateCounters();
}

function addNormalSpell(name, level) {
  const lvl = Number(level);
  const currentCounts = countPreparedByLevel(preparedSpells);
  const current = currentCounts[lvl] || 0;
  const max = spellSlots[lvl] ?? 0;

  if (current >= max) {
    alert(`You can only prepare ${max} normal spells of level ${lvl}.`);
    return;
  }

  preparedSpells.push(name);
  localStorage.setItem("preparedSpells", JSON.stringify(preparedSpells));
  updateCounters();
}

function updateNormalCountDisplay(spellName) {
  const countElems = document.querySelectorAll(`.normal-count[data-spell="${CSS.escape(spellName)}"]`);
  const currentCount = preparedSpells.filter(s => s === spellName).length;
  countElems.forEach(el => (el.textContent = `(${currentCount})`));
}

function updateSpecialistCountDisplay(spellName) {
 const countElems = document.querySelectorAll(`.specialist-count[data-spell="${CSS.escape(spellName)}"]`);
 const currentCount = specialistSpells.filter(s => s === spellName).length;
 countElems.forEach(el => (el.textContent = `(${currentCount}x)`));
}

// ==== RENDER CAST PAGE ====
// ==== RENDER CAST PAGE (updated for Normal + Specialist slots) ====
function renderChecked() {
  const list = document.getElementById("checkedList");
  list.innerHTML = "";

  if (preparedSpells.length === 0 && specialistSpells.length === 0) {
    list.innerHTML = "<li>No spells prepared yet.</li>";
    return;
  }

  const spellData = {};
  spells.forEach(spell => spellData[spell.name] = spell);

  // Group by level
  const grouped = {};
  preparedSpells.forEach(name => {
    const spell = spellData[name];
    const level = spell ? spell.level || "Unknown" : "Unknown";
    if (!grouped[level]) grouped[level] = { normal: {}, specialist: {} };
    grouped[level].normal[name] = (grouped[level].normal[name] || 0) + 1;
  });
  specialistSpells.forEach(name => {
    const spell = spellData[name];
    const level = spell ? spell.level || "Unknown" : "Unknown";
    if (!grouped[level]) grouped[level] = { normal: {}, specialist: {} };
    grouped[level].specialist[name] = (grouped[level].specialist[name] || 0) + 1;
  });

  // Render each level
  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(level => {
      const header = document.createElement("li");
      header.className = "cast-level-title";
      header.textContent = `Level ${level}`;
      list.appendChild(header);

      // === NORMAL SPELLS ===
      if (Object.keys(grouped[level].normal).length > 0) {
        const normalSection = document.createElement("div");
        normalSection.className = "cast-section normal-cast";
        const label = document.createElement("p");
        label.textContent = "Normal Slots:";
        label.style.color = "#ffcc00";
        label.style.margin = "0.4rem 0 0.2rem 0.5rem";
        normalSection.appendChild(label);

        const ul = document.createElement("ul");
        Object.entries(grouped[level].normal).forEach(([name, count]) => {
          const li = document.createElement("li");
          li.className = "spell-list-item normal";

          const spellLabel = document.createElement("span");
          spellLabel.textContent = `${name} (${count})`;
          spellLabel.style.color = "#ddd";

          // Tooltip description for hover
          // === Hover to show detailed info in right panel ===
          const spellDataItem = spellData[name];
          if (spellDataItem) {
            li.addEventListener("mouseenter", () => showSpellDetails(spellDataItem));
            li.addEventListener("mouseleave", clearSpellDetails);
          }

          const btn = document.createElement("button");
          btn.textContent = "Cast";
          btn.className = "cast-button";
          btn.addEventListener("click", () => {
            const idx = preparedSpells.indexOf(name);
            if (idx !== -1) {
              preparedSpells.splice(idx, 1);
              localStorage.setItem("preparedSpells", JSON.stringify(preparedSpells));

              // Update UI immediately
              updateCounters();
              updateNormalCountDisplay(name);
              renderChecked();
            }
          });


          li.appendChild(spellLabel);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        normalSection.appendChild(ul);
        list.appendChild(normalSection);
      }

      // === SPECIALIST SPELLS ===
      if (Object.keys(grouped[level].specialist).length > 0) {
        const specSection = document.createElement("div");
        specSection.className = "cast-section specialist-cast";
        const label = document.createElement("p");
        label.textContent = "Specialist Slots:";
        label.style.color = "#00bfff";
        label.style.margin = "0.4rem 0 0.2rem 0.5rem";
        specSection.appendChild(label);

        const ul = document.createElement("ul");
        Object.entries(grouped[level].specialist).forEach(([name, count]) => {
          const li = document.createElement("li");
          li.className = "spell-list-item specialist";

          const spellLabel = document.createElement("span");
          spellLabel.textContent = `${name} (${count})`;
          spellLabel.style.fontWeight = "bold";

          // === Hover to show detailed info in right panel ===
          const spellDataItem = spellData[name];
          if (spellDataItem) {
            li.addEventListener("mouseenter", () => showSpellDetails(spellDataItem));
            li.addEventListener("mouseleave", clearSpellDetails);
          }

          const btn = document.createElement("button");
          btn.textContent = "Cast";
          btn.className = "cast-button specialist-cast";
          btn.addEventListener("click", () => {
            const idx = specialistSpells.indexOf(name);
            if (idx !== -1) {
              specialistSpells.splice(idx, 1);
              localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));

              // Update UI immediately
              updateCounters();
              updateSpecialistCountDisplay(name);
              renderChecked();
            }
          });


          li.appendChild(spellLabel);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        specSection.appendChild(ul);
        list.appendChild(specSection);
      }
    });
}

// ==== UPDATE COUNTERS IN SPELLBOOK ====
function updateCounters() {
 const normalCounts = countPreparedByLevel(preparedSpells);
 const specialCounts = countPreparedByLevel(specialistSpells);
 const mode = localStorage.getItem("specialistMode");
 for (const level in spellSlots) {
 let baseMax = spellSlots[level];
 let displayMax = baseMax;
 // Apply high specialist penalty visually
 if (mode === "high") {
 displayMax = Math.max(0, baseMax - 1);
 }
 const used = normalCounts[level] || 0;
 const el = document.getElementById(`counter-${level}`);
 if (el) {
 el.innerHTML = ` (<span class="normal-text">${used}/${displayMax} normal</span>)`;
 }
 }
 for (const level in specialistSlots) {
 const used = specialCounts[level] || 0;
 const max = specialistSlots[level];
 const el = document.getElementById(`special-counter-${level}`);
 if (el) {
 el.innerHTML = ` (<span class="special-text">${used}/${max} specialist</span>)`;
 }
 }
}
// ==== EVENTS ====
document.getElementById('search').addEventListener('input', e => renderSpells(spells, e.target.value));
loadSpells();
// ==== SETTINGS MODAL ====
function openSettings() {
  const modal = document.getElementById("settingsModal");
  const form = document.getElementById("settingsForm");
  modal.style.display = "flex";

  const savedSlots = JSON.parse(localStorage.getItem("spellSlotsCustom")) || spellSlots;
  const savedSpecMode = localStorage.getItem("specialistMode") || "none";

  // Set checkboxes
  document.getElementById("isSpecialist").checked = savedSpecMode === "specialist" || savedSpecMode === "high";
  document.getElementById("isHighSpecialist").checked = savedSpecMode === "high";

  // Build simplified table (Normal slots only)
  // Split into two columns (0–4 and 5–9)
  let html = `
  <div class="dual-column">
    <table class="slot-table">
      <tr><th>Level</th><th>Normal Slots</th></tr>`;
  for (let lvl = 0; lvl <= 4; lvl++) {
    html += `
      <tr>
        <td>${lvl}</td>
        <td><input type="number" min="0" id="slot-${lvl}" value="${savedSlots[lvl] || 0}"></td>
      </tr>`;
  }
  html += `
    </table>
    <table class="slot-table">
      <tr><th>Level</th><th>Normal Slots</th></tr>`;
  for (let lvl = 5; lvl <= 9; lvl++) {
    html += `
      <tr>
        <td>${lvl}</td>
        <td><input type="number" min="0" id="slot-${lvl}" value="${savedSlots[lvl] || 0}"></td>
      </tr>`;
  }
  html += `
    </table>
  </div>`;
  form.innerHTML = html;

}

// === Checkbox Logic ===
const specialistBox = document.getElementById("isSpecialist");
const highSpecBox = document.getElementById("isHighSpecialist");
specialistBox.addEventListener("change", e => {
 if (!e.target.checked) {
 highSpecBox.checked = false;
 }
});
highSpecBox.addEventListener("change", e => {
 if (e.target.checked) {
 specialistBox.checked = true;
 }
});
document.getElementById("closeSettings").addEventListener("click", () => {
 document.getElementById("settingsModal").style.display = "none";
});
document.getElementById("saveSettings").addEventListener("click", () => {
  const newSlots = {};
  for (let lvl = 0; lvl <= 9; lvl++) {
    newSlots[lvl] = parseInt(document.getElementById(`slot-${lvl}`).value) || 0;
  }

  const isSpec = document.getElementById("isSpecialist").checked;
  const isHigh = document.getElementById("isHighSpecialist").checked;
  const schoolSelect = document.getElementById("specialistSchool");
  const selectedSchool = schoolSelect.value || "";

  let newSpecialist = {};
  let mode = "none";
  if (isHigh) {
    for (let lvl = 0; lvl <= 9; lvl++) newSpecialist[lvl] = 3;
    mode = "high";
  } else if (isSpec) {
    for (let lvl = 0; lvl <= 9; lvl++) newSpecialist[lvl] = 1;
    mode = "specialist";
  } else {
    for (let lvl = 0; lvl <= 9; lvl++) newSpecialist[lvl] = 0;
  }

  // Save
  localStorage.setItem("spellSlotsCustom", JSON.stringify(newSlots));
  localStorage.setItem("specialistMode", mode);
  localStorage.setItem("specialistSchool", selectedSchool);

  Object.assign(spellSlots, newSlots);
  Object.assign(specialistSlots, newSpecialist);

  updateCounters();
  if (spells && spells.length > 0) renderSpells(spells);

  // ✅ FIX HERE
  document.getElementById("settingsModal").style.display = "none";
});


// === Restore saved settings ===
(function restoreSettings() {
  const savedSlots = JSON.parse(localStorage.getItem("spellSlotsCustom"));
  const savedSpecMode = localStorage.getItem("specialistMode");
  const savedSpecSchool = localStorage.getItem("specialistSchool") || "";

  if (savedSlots) Object.assign(spellSlots, savedSlots);

  // Apply specialist mode logic
  if (savedSpecMode === "high") {
    for (let lvl = 0; lvl <= 9; lvl++) specialistSlots[lvl] = 3;
  } else if (savedSpecMode === "specialist") {
    for (let lvl = 0; lvl <= 9; lvl++) specialistSlots[lvl] = 1;
  } else {
    for (let lvl = 0; lvl <= 9; lvl++) specialistSlots[lvl] = 0;
  }

  const schoolSelect = document.getElementById("specialistSchool");
  if (schoolSelect) schoolSelect.value = savedSpecSchool;
})();

// ==== SPELL MANAGER ====
async function openSpellManager() {
 const modal = document.getElementById("spellManagerModal");
 modal.style.display = "flex";
 const listContainer = document.getElementById("spellManagerList");
 listContainer.innerHTML = "Loading spells...";
 try {
 // Always load from file
 const res = await fetch('spellData.json');
 if (!res.ok) throw new Error('Could not load spellData.json');
 const allSpells = await res.json();
 const activeSpells = JSON.parse(localStorage.getItem("activeSpells") || "[]");
 renderSpellManager(allSpells, activeSpells);
 } catch (err) {
 listContainer.textContent = err.message;
 }
}
function renderSpellManager(allSpells, activeSpells) {
 const listContainer = document.getElementById("spellManagerList");
 const searchInput = document.getElementById("spellSearchManager");
 const filterKeySelect = document.getElementById("spellFilterKey");
 const filterValueInput = document.getElementById("spellFilterValue");
 const applyFilterBtn = document.getElementById("applySpellFilter");
 const clearFilterBtn = document.getElementById("clearSpellFilter");
 function updateList(filterText = "", key = "", value = "") {
 const lower = filterText.toLowerCase();
 const lowerKey = key.toLowerCase();
 const lowerVal = value.toLowerCase();
 listContainer.innerHTML = "";
 const grouped = {};
 allSpells.forEach(spell => {
 let matchesSearch = true;
 let matchesFilter = true;
 // Basic text search across all fields
 if (lower) {
 const allText = Object.values(spell).join(" ").toLowerCase();
 matchesSearch = allText.includes(lower);
 }
 // Key/value filter
 if (lowerKey && lowerVal) {
 const fieldValue = (spell[lowerKey] || spell[lowerKey.replace(" ", "_")] || "").toString().toLowerCase();
 matchesFilter = fieldValue.includes(lowerVal);
 }
 if (matchesSearch && matchesFilter) {
 const lvl = spell.level ?? "Unknown";
 if (!grouped[lvl]) grouped[lvl] = [];
 grouped[lvl].push(spell);
 }
 });
 const sortedLevels = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
 sortedLevels.forEach(level => {
 const section = document.createElement("div");
 section.className = "manager-section";
 const header = document.createElement("h3");
 header.textContent = `Level ${level}`;
 header.style.color = "#ffcc00";
 header.style.margin = "0.6rem 0 0.3rem";
 section.appendChild(header);
 grouped[level]
 .sort((a, b) => a.name.localeCompare(b.name))
 .forEach(spell => {
 const row = document.createElement("div");
 row.className = "spell-item-row";
 row.style.display = "flex";
 row.style.alignItems = "center";
 row.style.justifyContent = "space-between";
 row.style.padding = "0.3rem 0.5rem";
 row.style.borderBottom = "1px solid #333";
 row.style.cursor = "pointer";
 row.dataset.tooltip = spell.description || spell.shortdesc || "No description.";
 const label = document.createElement("span");
 label.textContent = spell.name;
 label.style.flex = "1";
 label.style.color = "#fff";
 const checkbox = document.createElement("input");
 checkbox.type = "checkbox";
 checkbox.checked = activeSpells.includes(spell.name);
 checkbox.dataset.name = spell.name;
 row.addEventListener("click", e => {
 if (e.target.tagName.toLowerCase() !== "input") {
 checkbox.checked = !checkbox.checked;
 }
 });
 row.appendChild(label);
 row.appendChild(checkbox);
 section.appendChild(row);
 });
 listContainer.appendChild(section);
 });
 }
 // Search and filter listeners
 searchInput.oninput = () => updateList(searchInput.value, filterKeySelect.value, filterValueInput.value);
 applyFilterBtn.onclick = () => updateList(searchInput.value, filterKeySelect.value, filterValueInput.value);
 clearFilterBtn.onclick = () => {
 filterKeySelect.value = "";
 filterValueInput.value = "";
 updateList(searchInput.value);
 };
 // Initial render
 updateList();
 document.getElementById("saveSpellSelection").onclick = async () => {
 const selected = Array.from(listContainer.querySelectorAll("input[type=checkbox]:checked"))
 .map(cb => cb.dataset.name);
 localStorage.setItem("activeSpells", JSON.stringify(selected));
 const res = await fetch("spellData.json");
 const allData = await res.json();
 localStorage.setItem("allSpells", JSON.stringify(allData));
 spells = allData.filter(s => selected.includes(s.name));
 renderSpells(spells);
 updateCounters();
 document.getElementById("spellManagerModal").style.display = "none";
 };
 document.getElementById("closeSpellManager").onclick = () => {
 document.getElementById("spellManagerModal").style.display = "none";
 };
}

function showSpellDetails(spell) {
  const detail = document.getElementById("spellDetail");
  if (!detail) return;

  let html = "";
  for (const [key, value] of Object.entries(spell)) {
    if (!value || key === "name") continue;
    html += `<p><strong>${key}:</strong> ${value}</p>`;
  }

  detail.innerHTML = html;
}

function clearSpellDetails() {
  const detail = document.getElementById("spellDetail");
  if (!detail) return;
  detail.innerHTML = `<p class="placeholder">Hover over a spell to view its details.</p>`;
}
