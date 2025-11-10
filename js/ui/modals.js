import { getCurrentUser, setCurrentUser, isAdmin } from '../auth.js';
import * as db from '../api.js';
import { renderApp, renderPublicView } from './render.js';
import { hashPin, personas, currentPersona, currentPersonaAccess, setCurrentPersona, setCurrentPersonaAccess, allUsers } from './core.js';
import { attachDataListeners } from '../app.js';

// --- MODAL FUNCTIONS (DEFINED FIRST) ---

function openModal(title, contentHtml, maxWidth = 'max-w-md') {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div id="modal-backdrop" class="modal-overlay bg-black bg-opacity-50">
            <div class="bg-white rounded-lg shadow-xl w-full ${maxWidth}">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">${title}</h2>
                        <button id="close-modal-btn" class="text-3xl">&times;</button>
                    </div>
                    ${contentHtml}
                </div>
            </div>
        </div>`;
    document.getElementById('modal-backdrop').addEventListener('click', (e) => e.target.id === 'modal-backdrop' && closeModal());
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

export async function openAdminLoginModal() {
    await attachDataListeners(); // Ensure allUsers is populated
    // Filter for admin and sub-admin users
    const adminUsers = allUsers.filter(user => user.role === 'admin' || user.role === 'sub-admin');
    
    // Generate options for the dropdown
    const userOptions = adminUsers.map(user => 
        `<option value="${user.username}" ${user.username === 'admin' ? 'selected' : ''}>${user.username}</option>`
    ).join('');

    const content = `
        <form id="login-form" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold">Admin User</label>
                <select id="username" required class="mt-1 w-full">
                    ${userOptions}
                </select>
            </div>
            <div><label class="block text-sm font-semibold">4-Digit PIN</label><input type="password" id="pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" required class="mt-1" autocomplete="current-password"></div>
            <button type="submit" class="w-full btn-indigo">Login</button>
        </form>`;
    openModal("Admin Login", content);
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value; // Get username from select
        const user = await db.getUser(username);
        const hashedPin = await hashPin(document.getElementById('pin').value);
        if (user && user.pinHash === hashedPin) {
            setCurrentUser(user);
            closeModal();
            await attachDataListeners(); // Await data refresh
            renderApp();
        } else {
            alert('Username or PIN is incorrect.');
        }
    });
}

export async function openSettingsModal() {
    const content = `
        <form id="pin-change-form" class="space-y-4">
            <p>To change your PIN, enter your old PIN and a new one.</p>
            <div><label class="block text-sm font-semibold">Old PIN</label><input type="password" id="old-pin" maxlength="4" required class="mt-1" autocomplete="current-password"></div>
            <div><label class="block text-sm font-semibold">New PIN</label><input type="password" id="new-pin" maxlength="4" required class="mt-1" autocomplete="new-password"></div>
            <button type="submit" class="w-full btn-indigo">Change PIN</button>
        </form>`;
    openModal('Settings', content);
    document.getElementById('pin-change-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPin = document.getElementById('old-pin').value;
        const newPin = document.getElementById('new-pin').value;
        const user = getCurrentUser();
        const existingUser = await db.getUser(user.username);
        const oldPinHash = await hashPin(oldPin);
        if (!existingUser || existingUser.pinHash !== oldPinHash) {
            alert('Old PIN is incorrect.');
            return;
        }
        const newPinHash = await hashPin(newPin);
        await db.updateUserPin(user.username, newPinHash);
        alert('PIN updated successfully.');
        closeModal();
    });
}

export function openCreateSubAdminModal() {
   const content = `
       <form id="create-sub-admin-form" class="space-y-4">
           <p>Create a new sub-admin account. They can approve/reject spells.</p>
           <div><label class="block text-sm font-semibold">Username</label><input type="text" id="sub-admin-username" required class="mt-1"></div>
           <div><label class="block text-sm font-semibold">Temporary PIN</label><input type="password" id="sub-admin-pin" maxlength="4" required class="mt-1" autocomplete="new-password"></div>
           <button type="submit" class="w-full btn-indigo">Create Sub-Admin</button>
       </form>`;
   openModal('Create Sub-Admin', content);
   document.getElementById('create-sub-admin-form').addEventListener('submit', async (e) => {
       e.preventDefault();
       const username = document.getElementById('sub-admin-username').value.toLowerCase();
       const pin = document.getElementById('sub-admin-pin').value;
       if (!username || !pin) return alert('Username and PIN are required.');
       const existingUser = await db.getUser(username);
       if(existingUser) {
           alert('A user with this username already exists.');
           return;
       }
       const pinHash = await hashPin(pin);
       await db.createSubAdmin(username, pinHash);
       alert(`Sub-admin "${username}" created successfully.`);
       closeModal();
       attachDataListeners(); // Refresh data after creating a new sub-admin
   });
}

export function openAddPersonaModal() {
    const content = `
        <form id="add-persona-form" class="space-y-4">
            <div><label class="block text-sm font-semibold">Player Name*</label><input type="text" id="new-persona-name" required class="mt-1"></div>
            <div><label class="block text-sm font-semibold">Owner PIN (4 digits, for editing)</label><input type="password" id="owner-pin" pattern="\\d{4}" maxlength="4" class="mt-1"></div>
            <div><label class="block text-sm font-semibold">Guest PIN (4 digits, view-only)</label><input type="password" id="guest-pin" pattern="\\d{4}" maxlength="4" class="mt-1"></div>
            <button type="submit" class="w-full btn-indigo">Create Player</button>
        </form>`;
    openModal("Create New Player", content);
    document.getElementById('add-persona-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('new-persona-name').value.trim();
        if (!newName) return alert('Player name cannot be empty.');
        if (personas[newName]) return alert('A player with this name already exists.');
        
        const ownerPin = document.getElementById('owner-pin').value;
        const guestPin = document.getElementById('guest-pin').value;

        if (guestPin && !ownerPin) {
            return alert("An Owner PIN is required when setting a Guest PIN.");
        }

        const ownerPinHash = await hashPin(ownerPin);
        const guestPinHash = await hashPin(guestPin);

        const updatedPersonas = { ...personas, [newName]: { spells: [], ownerPinHash, guestPinHash } };
        await db.savePersonas(updatedPersonas);
        alert(`Player "${newName}" created!`);
        setCurrentPersona(newName);
        setCurrentPersonaAccess('owner');
        closeModal();
        attachDataListeners(); // Refresh data after creating a new persona
        renderPublicView();
    });
}

export function openPinModal(title, message, callback) {
    const content = `
        <form id="pin-form" class="space-y-4">
            <input type="text" autocomplete="username" class="hidden">
            <p class="mb-4">${message}</p>
            <div class="flex justify-center gap-2">
                <input type="password" maxlength="4" id="pin-input-modal" class="w-40 text-center text-2xl" autocomplete="current-password">
            </div>
            <div class="mt-6 flex justify-end gap-4">
                <button type="button" id="pin-cancel-btn" class="btn-gray">Cancel</button>
                <button type="submit" class="btn-indigo">Submit</button>
            </div>
        </form>`;
    openModal(title, content);
    
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('pin-input-modal');
    pinInput.focus();
    
    const submit = () => {
        const pin = pinInput.value;
        if (pin.length === 4 || pin.length === 0) {
            callback(pin);
            closeModal();
        } else {
            alert("Please enter a 4-digit PIN.");
        }
    };
    
    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submit();
    });

    document.getElementById('pin-cancel-btn').addEventListener('click', () => {
        closeModal();
        setCurrentPersona(null);
        setCurrentPersonaAccess(null);
        renderPublicView();
    });
}

export function openAddSpellModal() {
    const spellLevels = ["Cantrip", "1st-level", "2nd-level", "3rd-level", "4th-level", "5th-level", "6th-level", "7th-level", "8th-level", "9th-level"];
    const spellSchools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
    
    const content = `
         <form id="add-spell-form" class="space-y-2">
            <datalist id="level-list">${spellLevels.map(l => `<option value="${l}">`).join('')}</datalist>
            <datalist id="school-list">${spellSchools.map(s => `<option value="${s}">`).join('')}</datalist>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm">Spell Name*</label><input type="text" name="Spell Name" required></div>
                <div><label class="block text-sm">Level*</label><input type="text" name="Level" required list="level-list"></div>
                <div><label class="block text-sm">School</label><input type="text" name="School" list="school-list"></div>
                <div><label class="block text-sm">Casting Time</label><input type="text" name="Casting Time" value="1 action"></div>
                <div><label class="block text-sm">Range</label><input type="text" name="Range"></div>
                <div><label class="block text-sm">Components</label><input type="text" name="Components"></div>
            </div>
            <div><label class="block text-sm">Duration</label><input type="text" name="Duration"></div>
            <div><label class="block text-sm">Description*</label><textarea name="Description" rows="4" required></textarea></div>
            <div><label class="block text-sm">At Higher Levels</label><textarea name="Higher Level" rows="2"></textarea></div>
            <button type="submit" class="btn-indigo w-full mt-4">${isAdmin() ? 'Add to Global List' : 'Submit for Approval'}</button>
         </form>`;
    openModal('Submit a New Spell', content, 'max-w-lg');
    document.getElementById('add-spell-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newSpell = Object.fromEntries(formData.entries());
        
        if (isAdmin()) {
            await db.updateSpell(newSpell['Spell Name'], newSpell);
            alert('Spell added to global list!');
        } else {
            const submitterId = currentPersona && currentPersonaAccess === 'owner' ? currentPersona : 'public_submission';
            await db.submitSpellForApproval(newSpell, submitterId);
            alert('Spell submitted for approval!');
        }
        
        closeModal();
        await attachDataListeners(); // Await data refresh
        renderApp();
    });
}

export function openEditSpellModal(spell) {
    const spellLevels = ["Cantrip", "1st-level", "2nd-level", "3rd-level", "4th-level", "5th-level", "6th-level", "7th-level", "8th-level", "9th-level"];
    const spellSchools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];

    const content = `
        <form id="edit-spell-form" class="space-y-2">
            <datalist id="level-list">${spellLevels.map(l => `<option value="${l}">`).join('')}</datalist>
            <datalist id="school-list">${spellSchools.map(s => `<option value="${s}">`).join('')}</datalist>
           <div class="grid grid-cols-2 gap-4">
               <div><label class="block text-sm">Spell Name*</label><input type="text" name="Spell Name" value="${spell['Spell Name'] || ''}" required></div>
               <div><label class="block text-sm">Level*</label><input type="text" name="Level" value="${spell['Level'] || ''}" required list="level-list"></div>
               <div><label class="block text-sm">School</label><input type="text" name="School" value="${spell['School'] || ''}" list="school-list"></div>
               <div><label class="block text-sm">Casting Time</label><input type="text" name="Casting Time" value="${spell['Casting Time'] || ''}"></div>
               <div><label class="block text-sm">Range</label><input type="text" name="Range" value="${spell['Range'] || ''}"></div>
               <div><label class="block text-sm">Components</label><input type="text" name="Components" value="${spell['Components'] || ''}"></div>
           </div>
           <div><label class="block text-sm">Duration</label><input type="text" name="Duration" value="${spell['Duration'] || ''}"></div>
           <div><label class="block text-sm">Description*</label><textarea name="Description" rows="4" required>${spell['Description'] || ''}</textarea></div>
           <div><label class="block text-sm">At Higher Levels</label><textarea name="Higher Level" rows="2">${spell['Higher Level'] || ''}</textarea></div>
           <button type="submit" class="btn-indigo w-full mt-4">Save Changes</button>
        </form>`;
    openModal(`Edit "${spell['Spell Name']}"`, content, 'max-w-lg');
    document.getElementById('edit-spell-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newSpellData = Object.fromEntries(formData.entries());
        await db.updateSpell(spell['Spell Name'], newSpellData);
        alert('Spell updated successfully!');
        closeModal();
        renderApp(); // Refresh the app to update the spell list
    });
}

export function openConflictModal(existingSpell, newSpell) {
    return new Promise((resolve) => {
         const content = `
            <p class="mb-4">A spell named "${newSpell['Spell Name']}" already exists with different data. Choose which version to keep.</p>
            <div class="grid grid-cols-2 gap-4 text-sm overflow-y-auto" style="max-height: 50vh;">
                <div><h3 class="font-bold text-lg mb-2">Existing Spell</h3><div>${Object.entries(existingSpell).map(([key, value]) => `<div><strong>${key}:</strong> ${value || 'N/A'}</div>`).join('')}</div></div>
                <div><h3 class="font-bold text-lg mb-2">New (from CSV)</h3><div>${Object.entries(newSpell).map(([key, value]) => `<div><strong>${key}:</strong> ${value || 'N/A'}</div>`).join('')}</div></div>
            </div>
            <div class="mt-6 flex justify-end gap-4">
                <button id="conflict-keep-btn" class="btn-gray">Keep Existing</button>
                <button id="conflict-replace-btn" class="btn-indigo">Replace with New</button>
            </div>`;
        openModal('Spell Conflict', content, 'max-w-4xl');
        document.getElementById('conflict-keep-btn').onclick = () => { closeModal(); resolve('keep'); };
        document.getElementById('conflict-replace-btn').onclick = () => { closeModal(); resolve('replace'); };
    });
}

export function openPersonaSettingsModal() {
    if (!currentPersona || currentPersonaAccess !== 'owner') return;

    const persona = personas[currentPersona];
    const currentOwnerPinRequired = persona.ownerPinHash ? 'required' : '';

    const content = `
        <form id="persona-pin-form" class="space-y-4">
            <p>Enter your current Owner PIN to make changes. Leave new PIN fields blank to remove them.</p>
            <div><label class="block text-sm font-semibold">Current Owner PIN*</label><input type="password" id="current-owner-pin" maxlength="4" ${currentOwnerPinRequired} class="mt-1"></div>
            <hr>
            <div><label class="block text-sm font-semibold">New Owner PIN (optional)</label><input type="password" id="new-owner-pin" maxlength="4" class="mt-1"></div>
            <div><label class="block text-sm font-semibold">New Guest PIN (optional)</label><input type="password" id="new-guest-pin" maxlength="4" class="mt-1"></div>
            <button type="submit" class="w-full btn-indigo">Save PIN Changes</button>
        </form>`;
    openModal("Character Settings", content);

    document.getElementById('persona-pin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPin = document.getElementById('current-owner-pin').value;
        const currentPinHash = await hashPin(currentPin);
        
        if (persona.ownerPinHash && currentPinHash !== persona.ownerPinHash) {
            return alert("Current Owner PIN is incorrect.");
        }
        
        const newOwnerPin = document.getElementById('new-owner-pin').value;
        const newGuestPin = document.getElementById('new-guest-pin').value;
        
        if (newGuestPin && !newOwnerPin) {
             return alert("You must set a New Owner PIN if you are setting a New Guest PIN.");
        }

        persona.ownerPinHash = await hashPin(newOwnerPin);
        persona.guestPinHash = await hashPin(newGuestPin);

        await db.savePersonas(personas);
        alert("PIN settings updated successfully!");
        closeModal();
        attachDataListeners(); // Refresh data after updating persona settings
    });
}

export function openAdminChangePinModal(accountName, accountType) {
    let content;
    if (accountType === 'user') {
        content = `
            <form id="admin-pin-form" class="space-y-4">
                <p>Set a new 4-digit PIN for the sub-admin "${accountName}".</p>
                <div><label class="block text-sm font-semibold">New PIN*</label><input type="password" id="new-pin" maxlength="4" required class="mt-1"></div>
                <button type="submit" class="w-full btn-indigo">Set PIN</button>
            </form>`;
    } else { // persona
        content = `
            <form id="admin-pin-form" class="space-y-4">
                <p>Set new PINs for the player "${accountName}". Leave a field blank to remove that PIN.</p>
                <div><label class="block text-sm font-semibold">New Owner PIN</label><input type="password" id="new-owner-pin" maxlength="4" class="mt-1"></div>
                <div><label class="block text-sm font-semibold">New Guest PIN</label><input type="password" id="new-guest-pin" maxlength="4" class="mt-1"></div>
                <button type="submit" class="w-full btn-indigo">Set PINs</button>
            </form>`;
    }
    openModal("Admin: Change PIN", content);

    document.getElementById('admin-pin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (accountType === 'user') {
            const newPin = document.getElementById('new-pin').value;
            if (newPin.length !== 4) return alert("PIN must be 4 digits.");
            const newPinHash = await hashPin(newPin);
            await db.updateUserPin(accountName, newPinHash);
            alert(`PIN for ${accountName} has been changed.`);
        } else { // persona
            const newOwnerPin = document.getElementById('new-owner-pin').value;
            const newGuestPin = document.getElementById('new-guest-pin').value;
            if (newGuestPin && !newOwnerPin) {
                return alert("An Owner PIN is required if setting a Guest PIN.");
            }
            const persona = personas[accountName];
            persona.ownerPinHash = await hashPin(newOwnerPin);
            persona.guestPinHash = await hashPin(newGuestPin);
            await db.savePersonas(personas);
            alert(`PINs for ${accountName} have been updated.`);
        }
        closeModal();
        attachDataListeners(); // Refresh data after updating persona PINs
    });
}