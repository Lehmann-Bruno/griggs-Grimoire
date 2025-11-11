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


window.addEventListener("DOMContentLoaded", () => {
  const spellNavbar = document.getElementById('spell-navbar');
  const characterNavbar = document.getElementById('character-navbar');
  const spellbook = document.getElementById('spellbook');
  const skillsContainer = document.getElementById("skills-container");
  document.querySelector('nav a[onclick*="spellbook"]').classList.add("active");
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (spellbook) spellbook.classList.add('active');

  loadCharacterData();
  updateModifiers();
  updateHPBar();
  loadSavingThrows();
  renderSkills();
  loadSkillsFromLocalStorage();
  updateSkillTotals();

  skillsContainer.addEventListener("input", (e) => {
    if (
      e.target.classList.contains("skill-ranks") ||
      e.target.classList.contains("skill-misc") ||
      e.target.classList.contains("skill-ability")
    ) {
      updateSkillTotals();
      saveSkillsToLocalStorage();
    }
  });

  skillsContainer.addEventListener("change", (e) => {
    if (e.target.classList.contains("trained")) {
      updateSkillTotals();
      saveSkillsToLocalStorage();
    }
  });

  if (spellNavbar && characterNavbar) {
    spellNavbar.classList.add('navbar-active');
    characterNavbar.classList.remove('navbar-active');
  }
  
  // auto-save on any change
  document.getElementById("skills-container").addEventListener("input", () => {
    saveSkillsToLocalStorage();
  });

  
});

function showNavbar(pageId) {
  const spellNavbar = document.getElementById("spell-navbar");
  const characterNavbar = document.getElementById("character-navbar");

  // hide both navbars first
  spellNavbar.classList.remove("navbar-active");
  characterNavbar.classList.remove("navbar-active");

  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // show correct navbar + its default page
  if (pageId === "magic") {
    spellNavbar.classList.add("navbar-active");
    document.getElementById("spellbook").classList.add("active");
  } else if (pageId === "character") {
    characterNavbar.classList.add("navbar-active");
    document.getElementById("main").classList.add("active");
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

  // Try to find link by pageId inside onclick, even if combined with commas or spaces
  const link =
    document.querySelector(`#nav-${pageId} a`) ||
    Array.from(document.querySelectorAll('nav a')).find(a =>
      a.getAttribute('onclick')?.includes(`'${pageId}'`)
    );

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

  if (modal.style.display === "flex") {
    closeSettings();
    return;
  }
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
function closeSettings() {
  const modal = document.getElementById("settingsModal");
  modal.style.display = "none";
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

 if (modal.style.display === "flex") {
  closeSpellManager();
  return;
 }

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

function closeSpellManager() {
  const modal = document.getElementById("spellManagerModal");
  modal.style.display = "none";
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
 // === Tooltip hover for Manage Spells modal ===
  row.addEventListener("mouseenter", (e) => {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip-box";
    tooltip.textContent = row.dataset.tooltip;
    document.body.appendChild(tooltip);

    const moveTooltip = (ev) => {
      const offset = 15; // distance from cursor
      tooltip.style.position = "fixed";
      tooltip.style.left = `${ev.clientX + offset}px`;
      tooltip.style.top = `${ev.clientY + offset}px`;
    };

    document.addEventListener("mousemove", moveTooltip);
    row._tooltipEl = tooltip;
    row._moveHandler = moveTooltip;
  });

  row.addEventListener("mouseleave", () => {
    if (row._tooltipEl) row._tooltipEl.remove();
    if (row._moveHandler) document.removeEventListener("mousemove", row._moveHandler);
    row._tooltipEl = null;
    row._moveHandler = null;
  });

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
// === Close modals with ESC key ===
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const spellManager = document.getElementById("spellManagerModal");
    const settingsModal = document.getElementById("settingsModal");

    if (spellManager && spellManager.style.display === "flex") {
      spellManager.style.display = "none";
      console.log("Closed Manage Spells via ESC");
    }

    if (settingsModal && settingsModal.style.display === "flex") {
      settingsModal.style.display = "none";
      console.log("Closed Settings via ESC");
    }
  }
});
// === FULL CHARACTER SHEET LOCAL STORAGE SYSTEM ===

// --- Calculate D&D-style modifier ---
function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

// --- Update all modifier boxes based on current attributes ---
function updateModifiers() {
  const attrs = ["str", "dex", "con", "int", "wis", "cha"];
  attrs.forEach(attr => {
    const input = document.getElementById(attr);
    const value = parseInt(input.value) || 0;
    const mod = calculateModifier(value);
    const modElem = document.getElementById(`${attr}-mod`);
    if (modElem) modElem.value = mod >= 0 ? `+${mod}` : `${mod}`;
  });
}

// --- Update HP bar visually ---
function updateHPBar() {
  const current = parseInt(document.getElementById("currentHP").value) || 0;
  const max = parseInt(document.getElementById("maxHP").value) || 1;
  const percent = Math.max(0, Math.min(100, (current / max) * 100));

  const bar = document.getElementById("hp-bar");
  bar.style.width = percent + "%";

  // Color feedback
  bar.classList.remove("low", "mid", "high");
  if (percent < 30) bar.classList.add("low");
  else if (percent < 70) bar.classList.add("mid");
  else bar.classList.add("high");
}

// --- Save all character data to localStorage ---
function saveCharacterData() {
  const data = {
    // Header form fields
    name: document.getElementById("charName").value || "",
    player: document.getElementById("charPlayer").value || "",
    class: document.getElementById("charClass").value || "",
    level: parseInt(document.getElementById("charLevel").value) || 1,
    race: document.getElementById("charRace").value || "",
    alignment: document.getElementById("charAlignment").value || "",
    deity: document.getElementById("charDeity").value || "",

    // Attributes
    str: parseInt(document.getElementById("str").value) || 10,
    dex: parseInt(document.getElementById("dex").value) || 10,
    con: parseInt(document.getElementById("con").value) || 10,
    int: parseInt(document.getElementById("int").value) || 10,
    wis: parseInt(document.getElementById("wis").value) || 10,
    cha: parseInt(document.getElementById("cha").value) || 10,

    // HP
    currentHP: parseInt(document.getElementById("currentHP").value) || 0,
    maxHP: parseInt(document.getElementById("maxHP").value) || 1,
  };

  localStorage.setItem("characterData", JSON.stringify(data));
}

// --- Load character data from localStorage ---
function loadCharacterData() {
  const stored = JSON.parse(localStorage.getItem("characterData"));
  if (!stored) return;

  // Basic fields
  if (stored.name) document.getElementById("charName").value = stored.name;
  if (stored.player) document.getElementById("charPlayer").value = stored.player;
  if (stored.class) document.getElementById("charClass").value = stored.class;
  if (stored.level) document.getElementById("charLevel").value = stored.level;
  if (stored.race) document.getElementById("charRace").value = stored.race;
  if (stored.alignment) document.getElementById("charAlignment").value = stored.alignment;
  if (stored.deity) document.getElementById("charDeity").value = stored.deity;

  // Attributes
  const attrs = ["str", "dex", "con", "int", "wis", "cha"];
  attrs.forEach(attr => {
    if (stored[attr] !== undefined) {
      document.getElementById(attr).value = stored[attr];
    }
  });

  // HP
  if (stored.currentHP !== undefined)
    document.getElementById("currentHP").value = stored.currentHP;
  if (stored.maxHP !== undefined)
    document.getElementById("maxHP").value = stored.maxHP;

  updateModifiers();
  updateHPBar();
}

// --- Unified input listener for autosave ---
document.addEventListener("input", (e) => {
  const id = e.target.id;

  // HP or attribute update
  if (["currentHP", "maxHP"].includes(id)) {
    updateHPBar();
  }
  if (e.target.classList.contains("attr-input")) {
    updateModifiers();
    updateAllSaves();
    updateSkillTotals();
  }

  // Save everything on any input change
  saveCharacterData();
});

// === SAVING THROWS SYSTEM ===
// Fortitude = CON mod | Reflex = DEX mod | Will = WIS mod

function calculateSavingThrows() {
  const data = JSON.parse(localStorage.getItem("characterData")) || {};

  const saves = [
    { key: "fort", attr: "con" },
    { key: "ref", attr: "dex" },
    { key: "will", attr: "wis" }
  ];

  saves.forEach(save => {
    const attrScore = parseInt(document.getElementById(save.attr)?.value) || 10;
    const attrMod = Math.floor((attrScore - 10) / 2);
    const base = parseInt(document.getElementById(`${save.key}-base`).value) || 0;
    const custom = parseInt(document.getElementById(`${save.key}-custom`).value) || 0;

    const total = attrMod + base + custom;

    document.getElementById(`${save.key}-attr`).value = attrMod;
    document.getElementById(`${save.key}-total`).textContent = total >= 0 ? `+${total}` : `${total}`;

    // Save values
    data[`${save.key}-base`] = base;
    data[`${save.key}-custom`] = custom;
  });

  localStorage.setItem("characterData", JSON.stringify(data));
}

// --- Hook saving throws updates ---
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id && (id.includes("-base") || id.includes("-custom"))) {
    calculateSavingThrows();
  }
});

// --- Update when attributes change ---
function updateAllSaves() {
  updateModifiers();
  calculateSavingThrows();
}

// --- Load stored saves on start ---
function loadSavingThrows() {
  const stored = JSON.parse(localStorage.getItem("characterData")) || {};
  const saves = ["fort", "ref", "will"];
  saves.forEach(save => {
    if (stored[`${save}-base`] !== undefined)
      document.getElementById(`${save}-base`).value = stored[`${save}-base`];
    if (stored[`${save}-custom`] !== undefined)
      document.getElementById(`${save}-custom`).value = stored[`${save}-custom`];
  });
  calculateSavingThrows();
}

document.getElementById("printStorageButton").addEventListener("click", () => {
  const filteredData = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);

    // Skip full spell database
    if (key.toLowerCase().includes("allspells")) continue;

    try {
      const parsed = JSON.parse(value);

      // If it’s an array of spells, keep only their names
      if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object" && parsed[0].name) {
        filteredData[key] = parsed.map(spell => spell.name);
      }
      // If it’s a prepared spell list or other simple data
      else if (Array.isArray(parsed)) {
        filteredData[key] = parsed;
      } else {
        filteredData[key] = parsed;
      }
    } catch {
      filteredData[key] = value;
    }
  }

  console.log("=== LocalStorage (active & prepared spells only) ===");
  console.log(JSON.stringify(filteredData, null, 2));
});
const skills = [
  { name: "Appraise", ability: "int" },
  { name: "Balance", ability: "dex" },
  { name: "Bluff", ability: "cha" },
  { name: "Climb", ability: "str" },
  { name: "Concentration", ability: "con" },

  { name: "Craft1", display: "Craft", ability: "int", multi: true },
  { name: "Craft2", display: "Craft", ability: "int", multi: true },

  { name: "Decipher Script", ability: "int" },
  { name: "Diplomacy", ability: "cha" },
  { name: "Disable Device", ability: "int" },
  { name: "Disguise", ability: "cha" },
  { name: "Escape Artist", ability: "dex" },
  { name: "Forgery", ability: "int" },
  { name: "Gather Information", ability: "cha" },
  { name: "Handle Animal", ability: "cha" },
  { name: "Heal", ability: "wis" },
  { name: "Hide", ability: "dex" },
  { name: "Intimidate", ability: "cha" },
  { name: "Jump", ability: "str" },

  { name: "Knowledge1", display: "Knowledge", ability: "int", multi: true },
  { name: "Knowledge2", display: "Knowledge", ability: "int", multi: true },
  { name: "Knowledge3", display: "Knowledge", ability: "int", multi: true },
  { name: "Knowledge4", display: "Knowledge", ability: "int", multi: true },
  { name: "Knowledge5", display: "Knowledge", ability: "int", multi: true },

  { name: "Listen", ability: "wis" },
  { name: "Move Silently", ability: "dex" },
  { name: "Open Lock", ability: "dex" },
  
  { name: "Perform1", display: "Perform", ability: "cha", multi: true },
  { name: "Profession1", display: "Profession", ability: "wis", multi: true },

  { name: "Ride", ability: "dex" },
  { name: "Search", ability: "int" },
  { name: "Sense Motive", ability: "wis" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Spellcraft", ability: "int" },
  { name: "Spot", ability: "wis" },
  { name: "Survival", ability: "wis" },
  { name: "Swim", ability: "str" },
  { name: "Tumble", ability: "dex" },
  { name: "Use Magic Device", ability: "cha" },
  { name: "Use Rope", ability: "dex" }
];

function renderSkills() {
  const container = document.getElementById("skills-container");
  container.innerHTML = `
    <div class="skills-header">
      <span></span>
      <span>Skill</span>
      <span>Total</span>
      <span>Ability</span>
      <span>Ranks</span>
      <span>Misc</span>
    </div>
    <div class="skills-list">
      <div class="skills-column" id="col1"></div>
      <div class="skills-column" id="col2"></div>
    </div>
  `;

  const mid = Math.ceil(skills.length / 2);
  const col1 = document.getElementById("col1");
  const col2 = document.getElementById("col2");

  skills.forEach((skill, i) => {
    const row = document.createElement("div");
    row.className = "skill-row";
    row.dataset.skill = skill.name;

    const labelOrInput = skill.multi
      ? `<input type="text" class="skill-custom" placeholder="${skill.display || skill.name} Type">`
      : `<label>${skill.display || skill.name}</label>`;

    row.innerHTML = `
      <input type="checkbox" class="trained">
      ${labelOrInput}
      <input type="number" class="skill-total" placeholder="0" readonly>
      <select class="skill-ability">
        <option value="str" ${skill.ability === "str" ? "selected" : ""}>STR</option>
        <option value="dex" ${skill.ability === "dex" ? "selected" : ""}>DEX</option>
        <option value="con" ${skill.ability === "con" ? "selected" : ""}>CON</option>
        <option value="int" ${skill.ability === "int" ? "selected" : ""}>INT</option>
        <option value="wis" ${skill.ability === "wis" ? "selected" : ""}>WIS</option>
        <option value="cha" ${skill.ability === "cha" ? "selected" : ""}>CHA</option>
      </select>
      <input type="number" class="skill-ranks" placeholder="0">
      <input type="number" class="skill-misc" placeholder="0">
    `;

    (i < mid ? col1 : col2).appendChild(row);
  });
}
function saveSkillsToLocalStorage() {
  const skillsData = [];

  document.querySelectorAll('.skill-row').forEach(row => {
    const skill = {
      name: row.dataset.skill,
      trained: row.querySelector('.trained').checked,
      ability: row.querySelector('.skill-ability').value,
      total: row.querySelector('.skill-total').value,
      ranks: row.querySelector('.skill-ranks').value,
      misc: row.querySelector('.skill-misc').value,
    };

    // custom skill input (like "Arcana" or "Jewelry")
    const custom = row.querySelector('.skill-custom');
    if (custom) skill.customName = custom.value;

    skillsData.push(skill);
  });

  localStorage.setItem('skills', JSON.stringify(skillsData));
}
function loadSkillsFromLocalStorage() {
  const saved = JSON.parse(localStorage.getItem('skills') || '[]');

  saved.forEach(skill => {
    const row = [...document.querySelectorAll('.skill-row')].find(r => r.dataset.skill === skill.name);
    if (!row) return;

    row.querySelector('.trained').checked = !!skill.trained;
    row.querySelector('.skill-ability').value = skill.ability || 'int';
    row.querySelector('.skill-total').value = skill.total || 0;
    row.querySelector('.skill-ranks').value = skill.ranks || 0;
    row.querySelector('.skill-misc').value = skill.misc || 0;

    const custom = row.querySelector('.skill-custom');
    if (custom && skill.customName) custom.value = skill.customName;
  });

}

// === VALIDATE RANK LIMITS ===
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("skill-ranks")) {
    const charData = JSON.parse(localStorage.getItem("characterData")) || {};
    const charLevel = parseInt(charData.level) || 1;
    const maxRanks = charLevel + 3;

    const value = parseInt(e.target.value) || 0;
    if (value > maxRanks) {
      alert(`You cannot assign more than ${maxRanks} ranks (character level ${charLevel} + 3).`);
      e.target.value = maxRanks;
    }

    // Save immediately after validation
    saveSkillsToLocalStorage();
  }
});
// === CALCULATE AND UPDATE SKILL TOTALS ===
// === CALCULATE AND UPDATE SKILL TOTALS ===
function updateSkillTotals() {
  const charData = JSON.parse(localStorage.getItem("characterData") || "{}");

  const getMod = (score) => {
    const s = parseInt(score);
    const val = Number.isNaN(s) ? 10 : s;
    return Math.floor((val - 10) / 2);
  };

  const modifiers = {
    str: getMod(charData.str),
    dex: getMod(charData.dex),
    con: getMod(charData.con),
    int: getMod(charData.int),
    wis: getMod(charData.wis),
    cha: getMod(charData.cha),
  };

  document.querySelectorAll(".skill-row").forEach((row) => {
    const ability = row.querySelector(".skill-ability").value;
    const ranksInput = row.querySelector(".skill-ranks");
    const miscInput  = row.querySelector(".skill-misc");
    const trainedBox = row.querySelector(".trained");

    const ranks = parseFloat(ranksInput.value) || 0;
    const misc  = parseFloat(miscInput.value) || 0;
    const mod   = modifiers[ability] || 0;

    // === Apply D&D half-rank rule if not trained ===
    const effectiveRanks = trainedBox.checked ? ranks : ranks / 2;

    const total = Math.trunc(effectiveRanks + misc + mod);

    const totalInput = row.querySelector(".skill-total");
    if (totalInput) {
      totalInput.value = total >= 0 ? total.toFixed(0) : total.toFixed(0);
    }
  });
}


let userIsFocused = false;

document.addEventListener("focusin", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) {
    userIsFocused = true;
  }
});

document.addEventListener("focusout", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) {
    userIsFocused = false;
  }
});

document.addEventListener('keydown', function(event) {
  if (userIsFocused) {return}

  if (document.getElementById("spell-navbar").classList.contains("navbar-active")) {
    if (event.key === "'") {showNavbar("character");showPage("main");}
    if (event.key === "1") {showPage("spellbook");}
    if (event.key === "2") {showPage("cast");}
    if (event.key === "3") {openSettings();}
    if (event.key === "4") {openSpellManager();}
  } else {
    if (event.key === "'") {showNavbar("magic");showPage("spellbook");}
    if (event.key === "1") {showPage("main");}
    if (event.key === "2") {showPage("skills");}
    if (event.key === "3") {showPage("Feats");}
    if (event.key === "4") {showPage("Equipment");}
    if (event.key === "5") {showPage("Notes");}
  }
});
