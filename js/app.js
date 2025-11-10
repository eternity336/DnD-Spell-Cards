import { initTheme, handleCsvFileSelect, setAllSpells, setPendingSpells, setAllUsers, setPersonas } from './ui/core.js';
import { renderApp } from './ui/render.js';
import * as db from './api.js';
import { isAdmin, getCurrentUser } from './auth.js';

let unsubscribeGlobalSpells = () => {};
let unsubscribePendingSpells = () => {};
let unsubscribeUsers = () => {};
let unsubscribePersonas = () => {};

export async function attachDataListeners() { // Make it async
    // Unsubscribe from previous listeners
    unsubscribeGlobalSpells();
    unsubscribePendingSpells();
    unsubscribeUsers();
    unsubscribePersonas();

    const promises = [];

    promises.push(new Promise(resolve => {
        db.getGlobalSpells(snapshot => {
            const spells = snapshot.docs.map(doc => doc.data());
            setAllSpells(spells);
            resolve();
        });
    }));

    promises.push(new Promise(resolve => {
        db.getPendingSpells(snapshot => {
            const spells = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingSpells(spells);
            resolve();
        });
    }));

    promises.push(new Promise(resolve => {
        db.getUsers(snapshot => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(users);
            resolve();
        });
    }));

    promises.push(new Promise(resolve => {
        db.getPersonas(doc => {
            setPersonas(doc.exists() ? doc.data() : {});
            resolve();
        });
    }));

    await Promise.all(promises); // Wait for all data to be fetched
}

document.addEventListener('DOMContentLoaded', async () => {
    getCurrentUser();
    initTheme();
    await attachDataListeners(); // Await here
    renderApp(); // Render only after data is attached

    document.getElementById('csv-import-input').addEventListener('change', handleCsvFileSelect);
});