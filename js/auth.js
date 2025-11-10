import { attachDataListeners } from './app.js';
import { renderApp } from './ui/render.js';

// js/auth.js
let currentUser = null;

export function logout() {
    setCurrentUser(null);
    attachDataListeners();
    renderApp();
}
export function getCurrentUser() {
    if (!currentUser) {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            currentUser = JSON.parse(sessionUser);
        }
    }
    return currentUser;
}
export function setCurrentUser(user) {
    if (user) {
        currentUser = { username: user.username, role: user.role };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        currentUser = null;
        sessionStorage.removeItem('currentUser');
    }
}
export function isAdmin() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'sub-admin');
}