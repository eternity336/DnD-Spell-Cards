import { initTheme, handleCsvFileSelect, setAllSpells, setPendingSpells, setAllUsers, setPersonas } from './ui/core.js';
import { renderApp } from './ui/render.js';
import * as db from './firebase.js';
import { isAdmin, getCurrentUser } from './auth.js';

let unsubscribeGlobalSpells = () => {};
let unsubscribePendingSpells = () => {};
let unsubscribeUsers = () => {};
let unsubscribePersonas = () => {};

export function attachDataListeners() {
    // Unsubscribe from previous listeners
    unsubscribeGlobalSpells();
    unsubscribePendingSpells();
    unsubscribeUsers();
    unsubscribePersonas();

    unsubscribeGlobalSpells = db.getGlobalSpells(snapshot => {
        const spells = snapshot.docs.map(doc => doc.data());
        setAllSpells(spells);
        renderApp();
    });

    unsubscribePendingSpells = db.getPendingSpells(snapshot => {
        const spells = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingSpells(spells);
        renderApp();
    });

    if (isAdmin()) {
        unsubscribeUsers = db.getUsers(snapshot => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(users);
            renderApp();
        });
    }

    unsubscribePersonas = db.getPersonas(doc => {
        setPersonas(doc.exists() ? doc.data() : {});
        renderApp();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    getCurrentUser();
    initTheme();
    attachDataListeners();

    document.getElementById('csv-import-input').addEventListener('change', handleCsvFileSelect);
});