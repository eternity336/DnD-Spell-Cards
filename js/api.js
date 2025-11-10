// js/api.js

export async function getGlobalSpells(callback) {
    const response = await fetch('/api/spells');
    const data = await response.json();
    callback({ docs: data.data.map(s => ({ data: () => JSON.parse(s.data) })) });
}

export async function getUsers(callback) {
    const response = await fetch('/api/users');
    const data = await response.json();
    callback({ docs: data.data.map(u => ({ id: u.username, data: () => u })) });
}

export async function getUser(username) {
    const response = await fetch(`/api/users/${username}`);
    const data = await response.json();
    console.log('getUser API response data:', data); // Add this line
    return data.data;
}

export async function updateUserPin(username, newPinHash) {
    await fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pinHash: newPinHash })
    });
}

export async function createSubAdmin(username, pinHash) {
    await fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, pinHash, role: 'sub-admin' })
    });
}

export async function deleteUser(username) {
    await fetch(`/api/users/${username}`, {
        method: 'DELETE'
    });
}

export function getPersonas(callback) {
    fetch('/api/personas')
        .then(response => response.json())
        .then(data => {
            callback({ exists: () => Object.keys(data.data).length > 0, data: () => data.data });
        });
}

export async function savePersonas(personasData) {
    await fetch('/api/personas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(personasData)
    });
}

export async function updateSpell(oldSpellName, newSpellData) {
    const oldDocId = oldSpellName.replace(/[\s/]/g, '-').toLowerCase();
    await fetch(`/api/spells/${oldDocId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSpellData)
    });
}

export async function deleteSpell(spellName) {
    const docId = spellName.replace(/[\s/]/g, '-').toLowerCase();
    await fetch(`/api/spells/${docId}`, {
        method: 'DELETE'
    });
}

export async function batchUpdateSpells(spellsToUpload) {
    const spells = Array.from(spellsToUpload.values());
    await fetch('/api/spells', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(spells)
    });
}

export function getPendingSpells(callback) {
    fetch('/api/pending-spells')
        .then(response => response.json())
        .then(data => {
            callback({ docs: data.data.map(s => ({ id: s.name, data: () => ({ ...JSON.parse(s.data), submittedBy: s.submittedBy, status: s.status }) })) });
        });
}

export async function submitSpellForApproval(spellData, submitterId = 'public_submission') {
    await fetch('/api/pending-spells', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ spellData, submitterId })
    });
}

export async function approveSpell(pendingSpell) {
    await fetch('/api/pending-spells/approve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingSpell)
    });
}

export async function rejectSpell(pendingSpell) {
    await fetch('/api/pending-spells/reject', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingSpell)
    });
}