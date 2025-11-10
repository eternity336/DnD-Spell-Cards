import { attachDataListeners } from '../app.js';
import { getCurrentUser, isAdmin, logout } from '../auth.js';
import * as db from '../api.js';
import {
    allSpells, pendingSpells, allUsers, personas, currentPersona, currentPersonaAccess, currentMode,
    toggleTheme
} from './core.js';
import {
    openAdminLoginModal, openAddSpellModal, openAddPersonaModal, openPersonaSettingsModal, openEditSpellModal,
    openCreateSubAdminModal, openSettingsModal
} from './modals.js';
import {
    handlePersonaChange, togglePersonaEditMode, handleDeletePersona, handleAddSpellToPersona, handleRemoveSpellFromPersona,
    handleAdminActionClick
} from './handlers.js';

// --- COMPONENT RENDERERS ---

function createFilterHeader(containerId, title, spells, onFilter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const spellLevels = ["Cantrip", ...[...new Set(spells.map(s => s.Level).filter(l => l && l !== 'Cantrip'))].sort()];
    const spellSchools = [...new Set(spells.map(s => s.School).filter(Boolean))].sort();

    container.innerHTML = `
        <h2 class="text-xl font-bold mb-2">${title}</h2>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <select id="${containerId}-level-filter" class="w-full"><option value="">All Levels</option>${spellLevels.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
            <select id="${containerId}-school-filter" class="w-full"><option value="">All Schools</option>${spellSchools.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
        </div>
        <input type="text" id="${containerId}-search-input" placeholder="Search spells..." class="w-full">`;
    
    document.getElementById(`${containerId}-search-input`).addEventListener('keyup', onFilter);
    document.getElementById(`${containerId}-level-filter`).addEventListener('change', onFilter);
    document.getElementById(`${containerId}-school-filter`).addEventListener('change', onFilter);
}

function updatePersonaDropdown() {
    const select = document.getElementById('persona-select');
    if (!select) return;
    const selectedValue = currentPersona;
    select.innerHTML = '<option value="">-- Select Character --</option>';
    Object.keys(personas).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    select.value = selectedValue || "";
}

function renderSpellListItems(spells, listId, isGlobal = true) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;
    listEl.innerHTML = spells.map(spell => {
        const isPending = spell.status === 'pending';
        return `
        <div class="spell-item p-3 hover:bg-gray-100 rounded-md cursor-pointer" data-spell-name="${spell['Spell Name']}">
            <p class="font-semibold">${spell['Spell Name']} ${isPending ? '<span class="text-xs text-yellow-500">(Pending)</span>' : ''}</p>
            <p class="text-sm text-gray-500">${spell.Level || 'N/A'} - ${spell.School || 'N/A'}</p>
        </div>`;
    }).join('') || '<p class="p-4 text-gray-500">No spells found.</p>';
    
    document.querySelectorAll('.spell-item').forEach(item => {
        item.addEventListener('click', () => {
            const spellName = item.dataset.spellName;
            const sourceList = (isGlobal || !isAdmin()) 
                ? [...allSpells, ...pendingSpells] 
                : pendingSpells;
            const spell = sourceList.find(s => s['Spell Name'] === spellName);
            displaySpellCard(spell, isGlobal);
        });
    });

    const currentCard = document.getElementById('spell-card-view');
    if (!currentCard?.innerHTML.includes('No Spell Selected')) {
        // Don't auto-select if a card is already displayed
    } else if (spells.length > 0) {
        displaySpellCard(spells[0], isGlobal);
    } else {
        displaySpellCard(null);
    }
}

function displaySpellCard(spell, isGlobal) {
    const container = document.getElementById('spell-card-view');
    if (!container) return;
    if (!spell) {
        container.innerHTML = `<h2 class="text-2xl font-bold">No Spell Selected</h2>`;
        return;
    }
    const detailsOrder = ['Level', 'School', 'Casting Time', 'Range', 'Components', 'Duration', 'Description', 'Higher Level'];
    const detailsHtml = detailsOrder.map(key => spell[key] ? `<div><strong class="font-semibold">${key}:</strong> <span>${spell[key]}</span></div>` : '').join('');
    let actionsHtml = '';
    if (isAdmin()) {
        if (isGlobal && spell.status !== 'pending') {
            actionsHtml = `<div class="mt-6 flex gap-4"><button id="edit-spell-btn" class="btn-gray flex-1">Edit</button><button id="delete-spell-btn" class="btn-red flex-1">Delete</button></div>`;
        } else {
            actionsHtml = `<div class="mt-6 flex gap-4"><button id="approve-btn" class="btn-green flex-1">Approve</button><button id="reject-btn" class="btn-red flex-1">Reject</button></div>`;
        }
    }
    container.innerHTML = `
        <h2 class="text-3xl font-bold mb-2 text-indigo-600">${spell['Spell Name']} ${spell.status === 'pending' ? '<span class="text-lg text-yellow-500">(Pending)</span>' : ''}</h2>
        <p class="text-lg text-gray-500 mb-4">${spell.Level} - ${spell.School}</p>
        <div class="space-y-3 text-left">${detailsHtml}</div>
        ${actionsHtml}`;
    if (isAdmin()) {
        if (isGlobal && spell.status !== 'pending') {
            document.getElementById('edit-spell-btn').addEventListener('click', () => openEditSpellModal(spell));
            document.getElementById('delete-spell-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to permanently delete "${spell['Spell Name']}"?`)) {
                    await db.deleteSpell(spell['Spell Name']);
                    alert('Spell deleted.');
                    await attachDataListeners(); // Await data refresh
                    renderApp(); // Re-render the app to update the list
                }
            });
        } else {
            document.getElementById('approve-btn').addEventListener('click', async () => {
                if (confirm(`Approve "${spell['Spell Name']}"?`)) { await db.approveSpell(spell); alert('Spell approved!'); }
            });
            document.getElementById('reject-btn').addEventListener('click', async () => {
                if (confirm(`Reject and delete "${spell['Spell Name']}"?`)) {
                    await db.rejectSpell(spell);
                    alert('Spell rejected.');
                    // Await data refresh before re-rendering
                    await attachDataListeners();
                    renderApp(); // Re-render the app to update the list
                }
            });
        }
    }
}

// --- TOP-LEVEL VIEW RENDERERS (DEFINED BEFORE APP ENTRY POINT) ---

function renderSpellList() {
    const container = document.getElementById('spell-list-container');
    if (!container) return;
    
    // Initial structure
    container.innerHTML = `
        <div id="filter-header" class="p-4 border-b"></div>
        <div id="spell-list-items" class="overflow-y-auto custom-scrollbar p-2 flex-grow"></div>`;

    const performFilter = () => {
        let spellsToDisplay = [];
        let title = "All Spells";

        if (currentPersona && personas[currentPersona]) {
            title = `${currentPersona}'s Spells`;
            const personaSpellNames = personas[currentPersona].spells || [];
            const approvedPersonaSpells = allSpells.filter(s => personaSpellNames.includes(s['Spell Name']));
            const pendingPersonaSpells = pendingSpells.filter(p => p.submittedBy === currentPersona);
            spellsToDisplay = [...approvedPersonaSpells, ...pendingPersonaSpells];
        } else {
            spellsToDisplay = allSpells;
        }

        // Only update header if it doesn't exist
        if (!document.getElementById('filter-header-search-input')) {
            createFilterHeader('filter-header', title, [...allSpells, ...pendingSpells], performFilter);
        }
        
        const searchTerm = document.getElementById('filter-header-search-input').value.toLowerCase();
        const level = document.getElementById('filter-header-level-filter').value;
        const school = document.getElementById('filter-header-school-filter').value;

        const filtered = spellsToDisplay.filter(spell => 
            ((spell['Spell Name'] || '').toLowerCase().includes(searchTerm)) &&
            (!level || spell.Level === level) &&
            (!school || spell.School === school)
        );
        renderSpellListItems(filtered, 'spell-list-items');
    };
    performFilter();
}

export function renderPersonaEditView() {
    const personaSpells = personas[currentPersona]?.spells || [];
    document.getElementById('edit-persona-list-title').textContent = `${currentPersona}'s Spells`;

    const performGlobalFilter = () => {
        const searchTerm = document.getElementById('global-list-header-search-input').value.toLowerCase();
        const level = document.getElementById('global-list-header-level-filter').value;
        const school = document.getElementById('global-list-header-school-filter').value;
        const filtered = allSpells.filter(spell => 
            ((spell['Spell Name'] || '').toLowerCase().includes(searchTerm)) &&
            (!level || spell.Level === level) &&
            (!school || spell.School === school)
        );
        const globalListEl = document.getElementById('edit-global-list');
        globalListEl.innerHTML = filtered.map(spell => {
            const isAdded = personaSpells.includes(spell['Spell Name']);
            return `<div class="flex justify-between items-center p-3 hover:bg-gray-100 rounded-md"><div><p class="font-semibold">${spell['Spell Name']}</p><p class="text-sm text-gray-500">${spell.Level} - ${spell.School}</p></div><button class="btn-add-spell ${isAdded ? 'btn-gray' : 'btn-indigo'}" data-spell-name="${spell['Spell Name']}" ${isAdded ? 'disabled' : ''}>${isAdded ? '✓ Added' : 'Add'}</button></div>`;
        }).join('');
    };
    
    if (!document.getElementById('global-list-header-search-input')) {
        createFilterHeader('global-list-header', 'Global Spell List', allSpells, performGlobalFilter);
    }
    performGlobalFilter();

    const personaListEl = document.getElementById('edit-persona-list');
    personaListEl.innerHTML = allSpells
        .filter(s => personaSpells.includes(s['Spell Name']))
        .map(spell => `<div class="flex justify-between items-center p-3 hover:bg-gray-100 rounded-md"><div><p class="font-semibold">${spell['Spell Name']}</p><p class="text-sm text-gray-500">${spell.Level} - ${spell.School}</p></div><button class="btn-remove-spell btn-red" data-spell-name="${spell['Spell Name']}">Remove</button></div>`).join('') || '<p class="p-4 text-gray-500">No spells added yet.</p>';
    
    document.getElementById('edit-global-list').addEventListener('click', handleAddSpellToPersona);
    personaListEl.addEventListener('click', handleRemoveSpellFromPersona);
}

function renderAdminSpellList(spells, containerId, isGlobal) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!document.getElementById('admin-filter-header')) {
        container.innerHTML = `
            <div id="admin-filter-header" class="p-4 border-b"></div>
            <div id="spell-list-items" class="overflow-y-auto custom-scrollbar p-2 flex-grow"></div>`;
    }
    
    const performFilter = () => {
        const title = isGlobal ? 'Global Spells' : 'Pending Approval';
        if(!document.getElementById('admin-filter-header-search-input')) {
            createFilterHeader('admin-filter-header', title, spells, performFilter);
        }
        const searchTerm = document.getElementById('admin-filter-header-search-input').value.toLowerCase();
        const level = document.getElementById('admin-filter-header-level-filter').value;
        const school = document.getElementById('admin-filter-header-school-filter').value;
        const filtered = spells.filter(spell => 
            ((spell['Spell Name'] || '').toLowerCase().includes(searchTerm)) &&
            (!level || spell.Level === level) &&
            (!school || spell.School === school)
        );
        renderSpellListItems(filtered, 'spell-list-items', isGlobal);
    };
    performFilter();
}

function renderUserManagementView() {
    const subAdmins = allUsers.filter(u => u.role === 'sub-admin');
    
    const subAdminHtml = subAdmins.length ? subAdmins.map(user => `
        <div class="flex justify-between items-center p-3 hover:bg-gray-100 rounded-md">
            <p class="font-semibold">${user.id}</p>
            <div class="flex gap-2">
                <button class="btn-gray change-pin-btn" data-name="${user.id}" data-type="user">Change PIN</button>
                <button class="btn-red delete-btn" data-name="${user.id}" data-type="user">Delete</button>
            </div>
        </div>`).join('') : '<p class="p-4 text-gray-500">No sub-admins found.</p>';

    const personaHtml = Object.keys(personas).length ? Object.keys(personas).sort().map(name => `
        <div class="flex justify-between items-center p-3 hover:bg-gray-100 rounded-md">
            <p class="font-semibold">${name}</p>
            <div class="flex gap-2">
                <button class="btn-gray change-pin-btn" data-name="${name}" data-type="persona">Change PINs</button>
                <button class="btn-red delete-btn" data-name="${name}" data-type="persona">Delete</button>
            </div>
        </div>`).join('') : '<p class="p-4 text-gray-500">No characters found.</p>';

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div class="bg-white rounded-lg shadow-md list-panel">
                <div class="p-4 border-b"><h2 class="text-xl font-bold">Sub-Admins</h2></div>
                <div class="overflow-y-auto custom-scrollbar p-2 flex-grow">${subAdminHtml}</div>
            </div>
            <div class="bg-white rounded-lg shadow-md list-panel">
                <div class="p-4 border-b"><h2 class="text-xl font-bold">Characters (Personas)</h2></div>
                <div class="overflow-y-auto custom-scrollbar p-2 flex-grow">${personaHtml}</div>
            </div>
        </div>`;
}

export function switchAdminTab(tabName) {
    document.getElementById('global-spells-tab').dataset.active = tabName === 'global';
    document.getElementById('pending-spells-tab').dataset.active = tabName === 'pending';
    document.getElementById('users-tab').dataset.active = tabName === 'users';
    
    const main = document.getElementById('main-content-admin');

    if (tabName === 'users') {
        main.innerHTML = renderUserManagementView();
        main.querySelector('.grid').addEventListener('click', handleAdminActionClick);
    } else {
        main.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div id="spell-list-container" class="bg-white rounded-lg shadow-md list-panel"></div>
                <div id="spell-card-view" class="bg-white rounded-lg shadow-md flex flex-col p-6 overflow-y-auto custom-scrollbar"></div>
            </div>`;
        if (tabName === 'global') {
            renderAdminSpellList(allSpells, 'spell-list-container', true);
        } else {
            renderAdminSpellList(pendingSpells, 'spell-list-container', false);
        }
    }
}

function renderMainContent() {
    const main = document.getElementById('main-content');
    if (currentMode === 'edit' && currentPersonaAccess === 'owner') {
        main.innerHTML = `
            <div class="bg-white rounded-lg shadow-md list-panel">
                <div id="global-list-header" class="p-4 border-b"></div>
                <div id="edit-global-list" class="overflow-y-auto custom-scrollbar p-2 flex-grow"></div>
            </div>
            <div class="bg-white rounded-lg shadow-md list-panel">
                <div class="p-4 border-b"><h2 id="edit-persona-list-title" class="text-xl font-bold">Player's Spells</h2></div>
                <div id="edit-persona-list" class="overflow-y-auto custom-scrollbar p-2 flex-grow"></div>
            </div>`;
        renderPersonaEditView();
    } else {
        main.innerHTML = `
            <div id="spell-list-container" class="bg-white rounded-lg shadow-md list-panel"></div>
            <div id="spell-card-view" class="bg-white rounded-lg shadow-md flex flex-col p-6 overflow-y-auto custom-scrollbar"></div>`;
        renderSpellList();
    }
}

export function renderPublicView() {
    const container = document.getElementById('app-container');
    
    const personaOwnerButtons = currentPersona && currentPersonaAccess === 'owner' ?
        `<button id="persona-settings-btn" class="btn-gray">Character Settings</button>
         <button id="edit-persona-spells-btn" class="btn-gray">${currentMode === 'edit' ? 'Finish Editing' : 'Edit Spells'}</button>
         <button id="import-csv-btn" class="btn-gray">Import CSV</button>`: '';
         
    const adminDeleteButton = isAdmin() && currentPersona ? 
        `<button id="delete-persona-btn" class="btn-red">Delete Character</button>` : '';

    container.innerHTML = `
        <header class="mb-4">
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h1 class="text-3xl font-bold">Spellbook</h1>
                <div class="flex items-center gap-2 flex-wrap justify-end">
                    ${personaOwnerButtons}
                    <button id="add-spell-btn" class="btn-green">Submit a Spell</button>
                    <button id="admin-login-btn" class="btn-gray">Admin Login</button>
                    <button id="theme-toggle-btn" class="p-2 rounded-full">🌓</button>
                </div>
            </div>
            <div class="p-4 bg-white rounded-lg shadow-md flex items-end gap-2">
                <div class="flex-grow">
                    <label for="persona-select" class="block text-sm font-medium mb-1">View Characters</label>
                    <select id="persona-select" class="w-full"></select>
                </div>
                <button id="add-persona-btn" class="btn-green">New Character</button>
                ${adminDeleteButton}
            </div>
        </header>
        <main id="main-content" class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden mt-6"></main>`;

    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    document.getElementById('admin-login-btn').addEventListener('click', openAdminLoginModal);
    document.getElementById('add-spell-btn').addEventListener('click', openAddSpellModal);
    document.getElementById('add-persona-btn').addEventListener('click', openAddPersonaModal);
    document.getElementById('persona-select').addEventListener('change', handlePersonaChange);
    
    if (currentPersona && currentPersonaAccess === 'owner') {
        document.getElementById('edit-persona-spells-btn').addEventListener('click', togglePersonaEditMode);
        document.getElementById('persona-settings-btn').addEventListener('click', openPersonaSettingsModal);
        document.getElementById('import-csv-btn').addEventListener('click', () => document.getElementById('csv-import-input').click());
    }
    if (isAdmin() && currentPersona) {
        document.getElementById('delete-persona-btn').addEventListener('click', handleDeletePersona);
    }

    updatePersonaDropdown();
    renderMainContent();
}

function renderAdminView() {
    const user = getCurrentUser();
    const container = document.getElementById('app-container');
    const pendingCount = pendingSpells.length > 0 ? `<span class="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">${pendingSpells.length}</span>` : '';

    container.innerHTML = `
        <header class="mb-4 flex justify-between items-center flex-wrap gap-2">
            <h1 class="text-3xl font-bold">Admin Dashboard</h1>
            <div class="flex items-center gap-2 flex-wrap justify-end">
                <button id="add-spell-btn-admin" class="btn-green">Add Spell</button>
                <button id="import-csv-btn" class="btn-gray">Import CSV</button>
                ${user.role === 'admin' ? '<button id="create-sub-admin-btn" class="btn-green">Create Sub-Admin</button>' : ''}
                <button id="settings-btn" class="btn-gray">Settings</button>
                <button id="logout-btn" class="btn-red">Logout</button>
                <button id="theme-toggle-btn" class="p-2 rounded-full">🌓</button>
            </div>
        </header>
        <div class="flex bg-gray-200 rounded-lg p-1 mb-4">
            <button id="global-spells-tab" class="tab-button" data-active="true">Global Spells</button>
            <button id="pending-spells-tab" class="tab-button" data-active="false">Pending Spells ${pendingCount}</button>
            <button id="users-tab" class="tab-button" data-active="false">User Management</button>
        </div>
        <main id="main-content-admin" class="flex-grow h-full overflow-hidden">
        </main>`;
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    document.getElementById('import-csv-btn').addEventListener('click', () => document.getElementById('csv-import-input').click());
    document.getElementById('add-spell-btn-admin').addEventListener('click', openAddSpellModal);
    document.getElementById('global-spells-tab').addEventListener('click', () => switchAdminTab('global'));
    document.getElementById('pending-spells-tab').addEventListener('click', () => switchAdminTab('pending'));
    document.getElementById('users-tab').addEventListener('click', () => switchAdminTab('users'));
    
    if (user.role === 'admin') {
        document.getElementById('create-sub-admin-btn').addEventListener('click', openCreateSubAdminModal);
    }
    switchAdminTab('global');
}

// --- APP ENTRY POINT ---

export function renderApp() {
    getCurrentUser() && isAdmin() ? renderAdminView() : renderPublicView();
}