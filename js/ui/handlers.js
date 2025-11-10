import * as db from '../api.js';
import { openAdminChangePinModal, openPinModal } from './modals.js';
import { renderApp, renderPersonaEditView, renderPublicView } from './render.js';
import { personas, currentPersona, setCurrentPersona, setCurrentPersonaAccess, setCurrentMode, hashPin, currentMode } from './core.js';
import { isAdmin } from '../auth.js';
import { attachDataListeners } from '../app.js';

// --- EVENT HANDLERS ---

export function handleAdminActionClick(e) {
    const target = e.target;
    const name = target.dataset.name;
    const type = target.dataset.type;

    if (target.classList.contains('change-pin-btn')) {
        openAdminChangePinModal(name, type);
    } else if (target.classList.contains('delete-btn')) {
        if (type === 'user') {
            if (confirm(`Are you sure you want to delete the sub-admin "${name}"? This cannot be undone.`)) {
                db.deleteUser(name).then(() => {
                    alert(`Sub-admin "${name}" deleted.`);
                    attachDataListeners(); // Refresh data after deleting a user
                });
            }
        } else if (type === 'persona') {
            if (confirm(`Are you sure you want to delete the player "${name}"? This cannot be undone.`)) {
                delete personas[name];
                db.savePersonas(personas).then(() => {
                    alert(`Player "${name}" deleted.`);
                    if (currentPersona === name) {
                        setCurrentPersona(null);
                        setCurrentPersonaAccess(null);
                    }
                    attachDataListeners(); // Refresh data after deleting a persona
                });
            }
        }
    }
}

export async function handleAddSpellToPersona(e) {
    if (!e.target.matches('.btn-add-spell')) return;
    const spellName = e.target.dataset.spellName;
    if (currentPersona && personas[currentPersona] && !personas[currentPersona].spells.includes(spellName)) {
        personas[currentPersona].spells.push(spellName);
        await db.savePersonas(personas);
        renderPersonaEditView();
    }
}

export async function handleRemoveSpellFromPersona(e) {
    if (!e.target.matches('.btn-remove-spell')) return;
    const spellName = e.target.dataset.spellName;
    if (currentPersona && personas[currentPersona]) {
        personas[currentPersona].spells = personas[currentPersona].spells.filter(s => s !== spellName);
        await db.savePersonas(personas);
        renderPersonaEditView();
    }
}

export async function handleDeletePersona() {
    if (!isAdmin() || !currentPersona) return;
    if (confirm(`Are you sure you want to permanently delete the player "${currentPersona}"? This cannot be undone.`)) {
        delete personas[currentPersona];
        await db.savePersonas(personas);
        alert(`Player "${currentPersona}" has been deleted.`);
        setCurrentPersona(null);
        setCurrentPersonaAccess(null);
        renderApp(); // Re-render the whole app to reflect being logged in as admin without a persona
    }
}

export function togglePersonaEditMode() {
    setCurrentMode(currentMode === 'view' ? 'edit' : 'view');
    renderPublicView();
}

export async function handlePersonaChange(e) {
    const selectedName = e.target.value;
    setCurrentMode('view');
    if (!selectedName) {
        setCurrentPersona(null);
        setCurrentPersonaAccess(null);
        renderPublicView();
        return;
    }

    const persona = personas[selectedName];

    // Scenario 2: No PINs set at all
    if (!persona.ownerPinHash && !persona.guestPinHash) {
        setCurrentPersona(selectedName);
        setCurrentPersonaAccess('owner'); // Grant owner access directly
        renderPublicView();
        return;
    }

    // Scenarios 1, 3, 4: At least one PIN is set, so prompt for PIN
    openPinModal(`Login to ${selectedName}`, 'Enter PIN to access this character.', async (pin) => {
        const hashedPin = pin ? await hashPin(pin) : null; // Hash if PIN is provided

        // Check for Owner PIN first
        if (persona.ownerPinHash && hashedPin === persona.ownerPinHash) {
            setCurrentPersonaAccess('owner');
            setCurrentPersona(selectedName);
        }
        // If not owner, check for Guest PIN
        else if (persona.guestPinHash && hashedPin === persona.guestPinHash) {
            setCurrentPersonaAccess('guest');
            setCurrentPersona(selectedName);
        }
        // If no PIN provided, or incorrect PIN, handle based on guestPinHash presence
        // If no PIN provided, or incorrect PIN, handle based on guestPinHash presence
        else {
            let accessGranted = false;
            if (persona.guestPinHash) { // If a guest PIN is set
                alert('Incorrect PIN.');
                setCurrentPersona(null);
                setCurrentPersonaAccess(null);
            } else { // If no guest PIN is set
                setCurrentPersonaAccess('guest');
                setCurrentPersona(selectedName);
                accessGranted = true;
            }
        }
        renderPublicView();
    });
}