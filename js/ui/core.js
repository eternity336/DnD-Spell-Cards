import * as db from '../api.js';
import { openConflictModal, openDetailedConflictModal } from './modals.js';
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
    const orderedKeys = ['Spell Name', 'Level', 'School', 'Casting Time', 'Range', 'Area', 'Attack/Save', 'Damage/Effect', 'Ritual', 'Concentration', 'Components', 'Duration', 'Description', 'Higher Level', 'Classes', 'WIKIDOT', 'Source'];
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

async function resolveSpellConflict(existingSpell, newSpell) {
    const resolvedSpell = { ...existingSpell }; // Start with existing spell
    let conflicts = []; // To store fields with differing non-null values

    const allKeys = new Set([...Object.keys(existingSpell), ...Object.keys(newSpell)]);

    for (const key of allKeys) {
        const existingValue = existingSpell[key];
        const newValue = newSpell[key];

        if (key === 'Spell Name') { // Spell Name is the primary key, should not be changed by conflict resolution
            resolvedSpell[key] = existingValue;
            continue;
        }

        if ((existingValue === undefined || existingValue === null || existingValue === '') && (newValue !== undefined && newValue !== null && newValue !== '')) {
            // Existing is null/empty, new has a value, fill null
            resolvedSpell[key] = newValue;
        } else if ((existingValue !== undefined && existingValue !== null && existingValue !== '') && (newValue !== undefined && newValue !== null && newValue !== '') && existingValue !== newValue) {
            // Both have non-null/non-empty values, but they differ - this is a conflict
            conflicts.push({ key, existingValue, newValue });
        }
        // If existingValue and newValue are the same, or both are null/undefined/empty, do nothing (keep existing)
        // If existingValue is not null/undefined/empty and newValue is null/undefined/empty, keep existingValue
    }

    if (conflicts.length > 0) {
        const userChoices = await openDetailedConflictModal(existingSpell, newSpell, conflicts);
        for (const conflict of conflicts) {
            if (userChoices[conflict.key] === 'new') {
                resolvedSpell[conflict.key] = newSpell[conflict.key];
            } else { // userChoices[conflict.key] === 'existing'
                resolvedSpell[conflict.key] = existingSpell[conflict.key];
            }
        }
    }
    return resolvedSpell;
}

async function processAdminImport(importedSpells) {
    let spellsToUpload = new Map();
    for (const newSpell of importedSpells) {
        const existingSpell = allSpells.find(s => s['Spell Name'].toLowerCase() === newSpell['Spell Name'].toLowerCase());
        if (existingSpell) {
            // Resolve conflicts or fill nulls
            const resolvedSpell = await resolveSpellConflict(existingSpell, newSpell);
            
            // Check if the resolved spell is different from the existing one
            const canonicalExisting = JSON.stringify(getCanonicalSpell(existingSpell));
            const canonicalResolved = JSON.stringify(getCanonicalSpell(resolvedSpell));

            if (canonicalExisting !== canonicalResolved) {
                spellsToUpload.set(resolvedSpell['Spell Name'], resolvedSpell);
            }
        } else {
            spellsToUpload.set(newSpell['Spell Name'], newSpell);
        }
    }

    if (spellsToUpload.size > 0) {
        try {
            // Convert Map values to an array for batchUpdateSpells
            await db.batchUpdateSpells(Array.from(spellsToUpload.values()));
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
        'Upcast': 'Higher Level',
        'Book': 'Source', // Keep this for backward compatibility if 'Book' is used elsewhere
        'Source': 'Source', // Direct mapping for CSV 'Source' column
        'Area': 'Area',
        'Attack/Save': 'Attack/Save',
        'Damage/Effect': 'Damage/Effect',
        'Ritual': 'Ritual',
        'Concentration': 'Concentration',
        'Components': 'Components',
        'Classes': 'Classes',
        'WIKIDOT': 'WIKIDOT'
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