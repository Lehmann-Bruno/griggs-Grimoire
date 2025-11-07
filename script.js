// ==== GLOBAL STATE ====
let spells = [];
let preparedSpells = JSON.parse(localStorage.getItem("preparedSpells") || "[]");
let specialistSpells = JSON.parse(localStorage.getItem("specialistSpells") || "[]");// how many you can PREPARE per level
const spellSlots = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// how many SPECIALIST per level
const specialistSlots = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
// how many CASTS you have per level (for cast page)
const castsPerDay = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
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
function showPage(pageId) {
 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 document.getElementById(pageId).classList.add('active');
 if (pageId === 'cast') {
 renderChecked();
 }
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

// ==== LOAD CHARACTER SHEET (external page) ====
async function loadCharacterSheet() {
  const container = document.getElementById("character");
  container.innerHTML = "<p style='color:#888;'>Loading character...</p>";

  try {
    const res = await fetch("character.json");
    if (!res.ok) throw new Error("Could not load character.json");
    const charData = await res.json();

    renderCharacterSheet(charData);
    showPage("character");
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:#c00;">Error: ${err.message}</p>`;
  }
}

function renderCharacterSheet(c) {
  const container = document.getElementById("character");

  container.innerHTML = `
    <div class="char-card">
      <h2 style="color:#ffcc00;margin-bottom:0.5rem;">${c.name}</h2>
      <p><strong>Class:</strong> ${c.class}</p>
      <p><strong>Race:</strong> ${c.race}</p>
      <p><strong>Alignment:</strong> ${c.alignment}</p>
      <p><strong>Level:</strong> ${c.level}</p>

      <!-- Tabs -->
      <div class="char-tabs" style="margin-top:1rem;display:flex;gap:0.5rem;">
        <button id="tab-main" class="tab-button active-tab">Main Stats</button>
        <button id="tab-skills" class="tab-button">Skills</button>
      </div>

      <!-- Content area -->
      <div id="char-content" style="margin-top:1rem;"></div>
    </div>
  `;

  // === RENDER DEFAULT TAB ===
  renderMainStats(c);

  // === TAB SWITCHING ===
  document.getElementById("tab-main").addEventListener("click", () => {
    setActiveTab("main");
    renderMainStats(c);
  });

  document.getElementById("tab-skills").addEventListener("click", () => {
    setActiveTab("skills");
    renderSkillsDynamic();
  });

}

// helper to toggle active button style
function setActiveTab(tab) {
  document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active-tab"));
  document.getElementById(`tab-${tab}`).classList.add("active-tab");
}

// main stats tab
function renderMainStats(c) {
  const content = document.getElementById("char-content");
  content.innerHTML = `
    <h3 style="color:#ffcc00;">Attributes</h3>
    <div class="char-stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;">
      ${Object.entries(c.stats)
        .map(([k, v]) => `<div class="stat-box">${k}: <span>${v}</span></div>`)
        .join("")}
    </div>

    <h3 style="color:#ffcc00;margin-top:1rem;">HP & Defense</h3>
    <p><strong>HP:</strong> ${c.hp}</p>
    <p><strong>AC:</strong> ${c.ac}</p>
    <p><strong>Speed:</strong> ${c.speed} ft</p>

    <h3 style="color:#ffcc00;margin-top:1rem;">Equipment</h3>
    <ul>${c.equipment.map(e => `<li>${e}</li>`).join("")}</ul>
  `;
}

// skills tab
async function renderSkillsDynamic() {
  const content = document.getElementById("char-content");
  content.innerHTML = "<p style='color:#888;'>Loading skills...</p>";

  try {
    const [skillsRes, charRes] = await Promise.all([
      fetch("skills.json"),
      fetch("character.json")
    ]);
    if (!skillsRes.ok || !charRes.ok) throw new Error("Failed to load skill or character data.");

    const skillsList = await skillsRes.json();
    const charData = await charRes.json();
    const charSkills = charData.skills || {};

    content.innerHTML = `
      <h3 style="color:#ffcc00;">Skills</h3>
      <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
        <thead>
          <tr style="border-bottom:1px solid #333;color:#ffcc00;">
            <th style="text-align:left;">Skill</th>
            <th>Ability</th>
            <th>Ability Mod</th>
            <th>Rank</th>
            <th>Other</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${skillsList
            .map(skill => {
              const s = charSkills[skill.id] || { abilityMod: 0, rank: 0, misc: 0 };
              const total = s.abilityMod + s.rank + s.misc;
              return `
                <tr>
                  <td style="padding:4px 6px;">${skill.name}${skill.trainedOnly ? " *" : ""}</td>
                  <td style="text-align:center;">${skill.ability}</td>
                  <td style="text-align:center;color:#00bfff;">${s.abilityMod >= 0 ? "+" + s.abilityMod : s.abilityMod}</td>
                  <td style="text-align:center;">${s.rank}</td>
                  <td style="text-align:center;">${s.misc >= 0 ? "+" + s.misc : s.misc}</td>
                  <td style="text-align:center;color:#ffcc00;font-weight:600;">${total >= 0 ? "+" + total : total}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      <p style="font-size:0.8rem;color:#777;margin-top:0.5rem;">* trained-only skills require ranks to use</p>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:#c00;">Error: ${err.message}</p>`;
  }
}

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
function renderSpells(list, filterText = "") {
 const container = document.getElementById('spells');
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
 const grouped = {};
 filtered.forEach(spell => {
 const level = spell.level || "Unknown";
 if (!grouped[level]) grouped[level] = [];
 grouped[level].push(spell);
 });
 Object.keys(grouped)
 .sort((a, b) => Number(a) - Number(b))
 .forEach(level => {
 const section = document.createElement('div');
 section.style.width = "100%";
 const title = document.createElement('h2');
 title.textContent = `Level ${level}`;
 const normalCounter = document.createElement('span');
 normalCounter.id = `counter-${level}`;
 normalCounter.className = "counter normal-counter";
 title.appendChild(normalCounter);
 const specialistCounter = document.createElement('span');
 specialistCounter.id = `special-counter-${level}`;
 specialistCounter.className = "counter special-counter";
 title.appendChild(specialistCounter);
 section.appendChild(title);
 const levelContainer = document.createElement('div');
 levelContainer.className = "level-section";
 section.appendChild(levelContainer);
 grouped[level].forEach((spell, index) => {
 const card = document.createElement('div');
 card.className = "spell-card";
 // expand/collapse button
 const button = document.createElement('button');
 button.textContent = spell.name || `Spell ${index + 1}`;
 button.addEventListener('click', () => openSpell(card));
 card.appendChild(button);
 const checks = document.createElement('div');
 checks.className = "checkbox-group";
 // === Prepare checkbox ===
 const prepBox = document.createElement('input');
 prepBox.type = "checkbox";
 prepBox.id = `prep-${level}-${index}`;
 prepBox.value = spell.name;
 prepBox.dataset.spell = spell.name;
 prepBox.dataset.role = "prepare";
 prepBox.checked = preparedSpells.includes(spell.name);
 prepBox.addEventListener('change', () => togglePrepared(spell.name, prepBox.checked));
 checks.appendChild(prepBox);
 const prepLabel = document.createElement('label');
 prepLabel.textContent = "Prepare";
 prepLabel.setAttribute('for', prepBox.id);
 checks.appendChild(prepLabel);
 // === Specialist Slot BUTTON ===
 const selectedSchool = (localStorage.getItem("specialistSchool") || "").toLowerCase();
 const spellSchool = (spell.school || spell.School || spell.magic_school || "").toLowerCase();
 // Only show the specialist button if this spell matches your chosen school
 if (selectedSchool && spellSchool.includes(selectedSchool)) {
 const specContainer = document.createElement('div');
 specContainer.className = "specialist-container";
 const count = document.createElement('span');
 count.className = "specialist-count";
 count.dataset.spell = spell.name;
 // Initialize count display
 const currentCount = specialistSpells.filter(s => s === spell.name).length;
 count.textContent = `(${currentCount})`;
 const specBtn = document.createElement('button');
 specBtn.textContent = "+";
 specBtn.className = "add-specialist-btn";
 specBtn.title = "Add Specialist Slot";
 specBtn.dataset.spell = spell.name;
 specBtn.dataset.level = level;
 specBtn.addEventListener("click", () => {
 addSpecialistSpell(spell.name, level);
 updateSpecialistCountDisplay(spell.name);
 });
 const specLabel = document.createElement('label');
 specLabel.textContent = "Specialist Slot";
 specLabel.className = "specialist-label";
 specContainer.appendChild(count);
 specContainer.appendChild(specBtn);
 specContainer.appendChild(specLabel);
 checks.appendChild(specContainer);
 }
 card.appendChild(checks);
 const content = document.createElement('div');
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
function updateSpecialistCountDisplay(spellName) {
 const countElems = document.querySelectorAll(`.specialist-count[data-spell="${CSS.escape(spellName)}"]`);
 const currentCount = specialistSpells.filter(s => s === spellName).length;
 countElems.forEach(el => (el.textContent = `(${currentCount}x)`));
}

// ==== RENDER CAST PAGE ====
function renderChecked() {
 const list = document.getElementById("checkedList");
 list.innerHTML = "";
 let castsLeftByLevel = JSON.parse(localStorage.getItem("castsLeftByLevel")) || structuredClone(castsPerDay);
 const restBtn = document.getElementById("restButton");
 if (restBtn) {
 restBtn.onclick = () => {
 castsLeftByLevel = structuredClone(castsPerDay);
 localStorage.setItem("castsLeftByLevel", JSON.stringify(castsLeftByLevel));
 renderChecked();
 };
 }
 // If nothing prepared
 if (preparedSpells.length === 0 && specialistSpells.length === 0) {
 list.innerHTML = "<li>No spells prepared yet.</li>";
 return;
 }
 // Build spell data map
 const spellData = {};
 spells.forEach(spell => spellData[spell.name] = spell);
 // Group both lists by level
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
 // Render levels
 Object.keys(grouped)
 .sort((a, b) => Number(a) - Number(b))
 .forEach(level => {
 const lvl = Number(level);
 const castsLeft = castsLeftByLevel[lvl] ?? 0;
 const header = document.createElement("li");
 header.className = "cast-level-title";
 const title = document.createElement("strong");
 title.textContent = `Level ${level}`;
 const counter = document.createElement("span");
 counter.className = "cast-count";
 counter.dataset.level = level;
 counter.textContent = `${castsLeft} casts left`;
 header.appendChild(title);
 header.appendChild(counter);
 list.appendChild(header);
 // ==== NORMAL SPELLS ====
 if (Object.keys(grouped[level].normal).length > 0) {
 const sub = document.createElement("p");
 sub.textContent = "Normal Slots:";
 sub.style.color = "#ffcc00";
 sub.style.margin = "0.3rem 0 0.2rem 0.8rem";
 list.appendChild(sub);
 const ul = document.createElement("ul");
 Object.entries(grouped[level].normal).forEach(([name, count]) => {
 const li = document.createElement("li");
li.className = "spell-list-item normal";
 const label = document.createElement("span");
 label.textContent = name; // Normal spells don’t show remaining count
 const btn = document.createElement("button");
 btn.textContent = "Cast";
 btn.className = "cast-button";
 btn.addEventListener("click", (e) => {
 if (castsLeftByLevel[lvl] > 0) {
 castsLeftByLevel[lvl]--;
 localStorage.setItem("castsLeftByLevel", JSON.stringify(castsLeftByLevel));
 const counter = document.querySelector(`.cast-count[data-level="${lvl}"]`);
 if (counter) counter.textContent = `${castsLeftByLevel[lvl]} casts left`;
 // Add glow animation on the clicked spell
 const li = e.target.closest(".spell-list-item");
 renderChecked(); // refresh counts
 } else {
 alert(`No casts left for level ${lvl}!`);
 }
 });
 li.appendChild(label);
 li.appendChild(btn);
 ul.appendChild(li);
 });
 list.appendChild(ul);
 }
 // ==== SPECIALIST SPELLS ====
 if (Object.keys(grouped[level].specialist).length > 0) {
 const sub = document.createElement("p");
 sub.textContent = "Specialist Slots:";
 sub.style.color = "#00bfff";
 sub.style.margin = "0.3rem 0 0.2rem 0.8rem";
 list.appendChild(sub);
 const ul = document.createElement("ul");
 Object.entries(grouped[level].specialist).forEach(([name, count]) => {
 const li = document.createElement("li");
 li.className = "spell-list-item specialist";
 const label = document.createElement("span");
 label.textContent = `${name} (${count} remaining)`;
 label.style.fontWeight = "bold";
 const btn = document.createElement("button");
 btn.textContent = "Cast";
 btn.className = "cast-button specialist-cast";
 btn.addEventListener("click", (e) => {
 const li = e.target.closest(".spell-list-item");
 if (!li) return;
 const idx = specialistSpells.indexOf(name);
 if (idx !== -1) specialistSpells.splice(idx, 1);
 localStorage.setItem("specialistSpells", JSON.stringify(specialistSpells));
 // Add glow animation on the clicked spell
 updateCounters();
 updateSpecialistCountDisplay(name);
 renderChecked();
 });
 li.appendChild(label);
 li.appendChild(btn);
 ul.appendChild(li);
 });
 list.appendChild(ul);
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
 const savedCasts = JSON.parse(localStorage.getItem("castsPerDayCustom")) || castsPerDay;
 const savedSpecMode = localStorage.getItem("specialistMode") || "none";
 // Set checkboxes
 document.getElementById("isSpecialist").checked = savedSpecMode === "specialist" || savedSpecMode === "high";
 document.getElementById("isHighSpecialist").checked = savedSpecMode === "high";
 // Build table (Normal slots + Casts)
 let html = `<table><tr><th>Level</th><th>Normal Slots</th><th>Casts/Day</th></tr>`;
 for (let lvl = 0; lvl <= 9; lvl++) {
 html += `
 <tr>
 <td>${lvl}</td>
 <td><input type="number" min="0" id="slot-${lvl}" value="${savedSlots[lvl] || 0}"></td>
 <td><input type="number" min="0" id="cast-${lvl}" value="${savedCasts[lvl] || 0}"></td>
 </tr>`;
 }
 html += `</table>`;
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
 const newCasts = {};
 for (let lvl = 0; lvl <= 9; lvl++) {
 newSlots[lvl] = parseInt(document.getElementById(`slot-${lvl}`).value) || 0;
 newCasts[lvl] = parseInt(document.getElementById(`cast-${lvl}`).value) || 0;
 }
 const isSpec = specialistBox.checked;
 const isHigh = highSpecBox.checked;
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
 // Save settings
 localStorage.setItem("spellSlotsCustom", JSON.stringify(newSlots));
 localStorage.setItem("castsPerDayCustom", JSON.stringify(newCasts));
 localStorage.setItem("specialistMode", mode);
 localStorage.setItem("specialistSchool", selectedSchool);
 Object.assign(spellSlots, newSlots);
 Object.assign(castsPerDay, newCasts);
 Object.assign(specialistSlots, newSpecialist);
 localStorage.setItem("castsLeftByLevel", JSON.stringify(newCasts));
 updateCounters();
 if (spells && spells.length > 0) {
 renderSpells(spells);
 }
 document.getElementById("settingsModal").style.display = "none";
});
// === Restore saved settings ===
(function restoreSettings() {
 const savedSlots = JSON.parse(localStorage.getItem("spellSlotsCustom"));
 const savedCasts = JSON.parse(localStorage.getItem("castsPerDayCustom"));
 const savedSpecMode = localStorage.getItem("specialistMode");
 const savedSpecSchool = localStorage.getItem("specialistSchool") || "";
 if (savedSlots) Object.assign(spellSlots, savedSlots);
 if (savedCasts) Object.assign(castsPerDay, savedCasts);
 // Apply specialist slot logic dynamically
 if (savedSpecMode === "high") {
 for (let lvl = 0; lvl <= 9; lvl++) specialistSlots[lvl] = 3;
 // Normal slots stay as the user defined in settings
 // The -1 reduction happens dynamically in runtime, not here
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
// === GLOBAL TOOLTIP HANDLER ===
let tooltipDiv = null;
document.addEventListener("mouseover", e => {
  const row = e.target.closest(".spell-item-row");
  if (!row || !row.dataset.tooltip) return;

  if (!tooltipDiv) {
    tooltipDiv = document.createElement("div");
    tooltipDiv.style.position = "fixed";
    tooltipDiv.style.background = "rgba(20,20,20,0.95)";
    tooltipDiv.style.color = "#f1f1f1";
    tooltipDiv.style.border = "1px solid #555";
    tooltipDiv.style.borderRadius = "6px";
    tooltipDiv.style.padding = "0.6rem";
    tooltipDiv.style.fontSize = "0.85rem";
    tooltipDiv.style.lineHeight = "1.25";
    tooltipDiv.style.maxWidth = "320px";
    tooltipDiv.style.pointerEvents = "none";
    tooltipDiv.style.zIndex = "999999";
    tooltipDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.6)";
    document.body.appendChild(tooltipDiv);
  }

  tooltipDiv.textContent = row.dataset.tooltip;
  tooltipDiv.style.display = "block";
  tooltipDiv.style.opacity = "1";

  const moveTooltip = ev => {
    const padding = 12;
    let x = ev.clientX + padding;
    let y = ev.clientY + padding;
    const rect = tooltipDiv.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 5) x = ev.clientX - rect.width - padding;
    if (y + rect.height > window.innerHeight - 5) y = ev.clientY - rect.height - padding;
    tooltipDiv.style.left = `${x}px`;
    tooltipDiv.style.top = `${y}px`;
  };

  document.addEventListener("mousemove", moveTooltip);
  row.addEventListener("mouseleave", () => {
    tooltipDiv.style.display = "none";
    document.removeEventListener("mousemove", moveTooltip);
  }, { once: true });
});

document.getElementById("openSettingsButton").addEventListener("click", openSettings);