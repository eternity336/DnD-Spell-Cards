import * as db from '../api.js';
import { openConflictModal } from './modals.js';
import { isAdmin } from '../auth.js';

export let allSpells = [];
export let pendingSpells = [];

export let allUsers = [];
export let personas = {};
export let currentPersona = null;
export let currentPersonaAccess = null;
export let currentMode = 'view';

export function setAllSpells(spells) {
    allSpells = spells;
}

export function setPendingSpells(spells) {
    pendingSpells = spells;
}

export function setAllUsers(users) {
    allUsers = users;
}

export function setPersonas(p) {
    personas = p;
}

export function setCurrentPersona(persona) {
    currentPersona = persona;
}

export function setCurrentPersonaAccess(access) {
    currentPersonaAccess = access;
}

export function setCurrentMode(mode) {
    currentMode = mode;
}

export function hashPin(pin) {
    if (!pin) return null;
    return sha256(pin);
}

export function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && globalThis.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// --- CSV IMPORT LOGIC ---

export function handleCsvFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (results.errors.length) {
                    alert("Error parsing CSV. Check console for details.");
                    console.error("CSV Errors:", results.errors);
                } else {
                    await processImportedSpells(results.data);
                }
            }
        });
    }
    event.target.value = '';
}

function getCanonicalSpell(spell) {
    const orderedKeys = ['Spell Name', 'Level', 'School', 'Casting Time', 'Range', 'Components', 'Duration', 'Description', 'Higher Level'];
    const canonical = {};
    for (const key of orderedKeys) {
        if (spell[key]) {
            canonical[key] = spell[key];
        }
    }
    return canonical;
}

function mapImportedSpell(row, headerMapping) {
    const spell = {};
    for (const key in row) {
        const appKey = headerMapping[key.trim()] || key.trim();
        if (row[key]) {
            spell[appKey] = row[key];
        }
    }
    return spell;
}

async function processAdminImport(importedSpells) {
    let spellsToUpload = new Map();
    for (const newSpell of importedSpells) {
        const existingSpell = allSpells.find(s => s['Spell Name'].toLowerCase() === newSpell['Spell Name'].toLowerCase());
        if (existingSpell) {
            const canonicalExisting = JSON.stringify(getCanonicalSpell(existingSpell));
            const canonicalNew = JSON.stringify(getCanonicalSpell(newSpell));

            if (canonicalExisting !== canonicalNew) {
                const userChoice = await openConflictModal(existingSpell, newSpell);
                if (userChoice === 'replace') {
                    spellsToUpload.set(newSpell['Spell Name'], newSpell);
                }
            }
        } else {
            spellsToUpload.set(newSpell['Spell Name'], newSpell);
        }
    }

    if (spellsToUpload.size > 0) {
        try {
            await db.batchUpdateSpells(spellsToUpload);
            alert(`Import complete! ${spellsToUpload.size} spells were added or updated.`);
        } catch (error) {
            console.error("Error writing spells to Firestore:", error);
            alert("There was an error saving imported spells. Please check your Firestore rules.");
        }
    } else {
        alert("Import complete. No new spells or changes were found to import.");
    }
}

async function processPersonaImport(importedSpells) {
    const submitterId = currentPersona || 'public_submission';
    try {
        for (const spell of importedSpells) {
            await db.submitSpellForApproval(spell, submitterId);
        }
        alert(`${importedSpells.length} spells submitted for approval! They are now visible in your spell list.`);
    } catch(error) {
        console.error("Error submitting spells for approval:", error);
        alert("An error occurred while submitting spells.");
    }
}

async function processImportedSpells(importedData) {
    const headerMapping = {
        'Name': 'Spell Name',
        'Details': 'Description',
        'Upcast': 'Higher Level'
    };

    const importedSpells = importedData.map(row => mapImportedSpell(row, headerMapping))
        .filter(spell => spell['Spell Name'] && spell['Spell Name'].trim() !== '');

    if (importedSpells.length === 0) {
        alert("No valid spells with a 'Spell Name' or 'Name' column found in the CSV file.");
        return;
    }

    if (isAdmin()) { // Admin batch import with conflict resolution
        await processAdminImport(importedSpells);
    } else { // Persona import to pending
        await processPersonaImport(importedSpells);
    }
}