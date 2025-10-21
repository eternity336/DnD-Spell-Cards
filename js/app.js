import { initTheme, handleCsvFileSelect, setAllSpells, setPendingSpells, setAllUsers, setPersonas } from './ui/core.js';
import { renderApp } from './ui/render.js';
import { isAdmin, getCurrentUser } from './auth.js';

export function attachDataListeners() {
    fetch('/api/spells')
        .then(response => response.json())
        .then(spells => {
            setAllSpells(spells);
            renderApp();
        });

    // TODO: Re-implement the following with API calls
}

document.addEventListener('DOMContentLoaded', () => {
    getCurrentUser();
    initTheme();
    attachDataListeners();

    document.getElementById('csv-import-input').addEventListener('change', handleCsvFileSelect);
});