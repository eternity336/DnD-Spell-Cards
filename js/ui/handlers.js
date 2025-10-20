import * as db from '../firebase.js';
import { openAdminChangePinModal, openPinModal } from './modals.js';
import { renderApp, renderPersonaEditView, renderPublicView, switchAdminTab } from './render.js';
import { personas, currentPersona, setCurrentPersona, setCurrentPersonaAccess, setCurrentMode, hashPin, currentMode } from './core.js';
import { isAdmin } from '../auth.js';

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
                db.deleteUser(name).then(() => alert(`Sub-admin "${name}" deleted.`));
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
                    // No full re-render needed, updatePersonas will handle the list update
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
    if (persona.ownerPinHash) {
        openPinModal(`Login to ${selectedName}`, 'Enter PIN to access this player.', async (pin) => {
            if (!pin) {
                setCurrentPersona(null);
                setCurrentPersonaAccess(null);
                renderPublicView();
                return;
            }
            const hashedPin = await hashPin(pin);
            if (persona.ownerPinHash && hashedPin === persona.ownerPinHash) {
                setCurrentPersonaAccess('owner');
                setCurrentPersona(selectedName);
            } else if (persona.guestPinHash && hashedPin === persona.guestPinHash) {
                setCurrentPersonaAccess('guest');
                setCurrentPersona(selectedName);
            } else {
                alert('Incorrect PIN.');
                setCurrentPersona(null);
                setCurrentPersonaAccess(null);
            }
            renderPublicView();
        });
    } else {
        setCurrentPersona(selectedName);
        setCurrentPersonaAccess('owner');
        renderPublicView();
    }
}