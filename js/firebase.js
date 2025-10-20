// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, writeBatch, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBbFkH2eqqdAyXe51BFXhHwn9Ppt_PiJXI",
    authDomain: "dnd-spellbook-c5d20.firebaseapp.com",
    projectId: "dnd-spellbook-c5d20",
    storageBucket: "dnd-spellbook-c5d20.appspot.com",
    messagingSenderId: "544494656753",
    appId: "1:544494656753:web:bd2be959508ba757369d50",
    measurementId: "G-RY3HJB9B7J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- USER MANAGEMENT (ADMIN) ---
export function getUsers(callback) {
    return onSnapshot(collection(db, "users"), callback);
}
export async function getUser(username) {
    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
}
export async function updateUserPin(username, newPinHash) {
    const userRef = doc(db, "users", username);
    await setDoc(userRef, { pinHash: newPinHash }, { merge: true });
}
export async function createSubAdmin(username, pinHash) {
    const userRef = doc(db, "users", username);
    await setDoc(userRef, { username, pinHash, role: 'sub-admin' });
}
export async function deleteUser(username) {
    const userRef = doc(db, "users", username);
    await deleteDoc(userRef);
}

// --- PUBLIC DATA (PERSONAS) ---
export function getPersonas(callback) {
    return onSnapshot(doc(db, "appData", "personas"), callback);
}
export async function savePersonas(personasData) {
    const docRef = doc(db, "appData", "personas");
    await setDoc(docRef, personasData);
}

// --- SPELL MANAGEMENT ---
export function getGlobalSpells(callback) {
    return onSnapshot(collection(db, "spells"), callback);
}
export async function updateSpell(oldSpellName, newSpellData) {
    const batch = writeBatch(db);
    const oldDocId = oldSpellName.replace(/[\s/]/g, '-').toLowerCase();
    const oldDocRef = doc(db, "spells", oldDocId);
    
    const newDocId = newSpellData['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    const newDocRef = doc(db, "spells", newDocId);

    if (oldDocId !== newDocId) {
        batch.delete(oldDocRef);
    }
    batch.set(newDocRef, newSpellData);
    await batch.commit();
}
export async function deleteSpell(spellName) {
    const docId = spellName.replace(/[\s/]/g, '-').toLowerCase();
    const docRef = doc(db, "spells", docId);
    await deleteDoc(docRef);
}
export async function batchUpdateSpells(spellsToUpload) {
    const batch = writeBatch(db);
    spellsToUpload.forEach((spell, name) => {
        const docId = name.replace(/[\s/]/g, '-').toLowerCase();
        const spellRef = doc(db, "spells", docId);
        batch.set(spellRef, spell);
    });
    await batch.commit();
}

// --- PENDING SPELLS ---
export function getPendingSpells(callback) {
    return onSnapshot(collection(db, "pendingSpells"), callback);
}
export async function submitSpellForApproval(spellData, submitterId = 'public_submission') {
    const docId = spellData['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    const spellRef = doc(db, "pendingSpells", docId);
    await setDoc(spellRef, { ...spellData, submittedBy: submitterId, status: 'pending' });
}
export async function approveSpell(pendingSpell) {
    const batch = writeBatch(db);
    const docId = pendingSpell['Spell Name'].replace(/[\s/]/g, '-').toLowerCase();
    
    const globalSpellData = { ...pendingSpell };
    delete globalSpellData.id; // Firestore ID from pending collection
    delete globalSpellData.submittedBy; // No longer needed
    delete globalSpellData.status; // No longer needed
    
    const globalSpellRef = doc(db, "spells", docId);
    batch.set(globalSpellRef, globalSpellData);

    const pendingSpellRef = doc(db, "pendingSpells", pendingSpell.id);
    batch.delete(pendingSpellRef);

    await batch.commit();
}
export async function rejectSpell(pendingSpell) {
    const pendingSpellRef = doc(db, "pendingSpells", pendingSpell.id);
    await deleteDoc(pendingSpellRef);
}