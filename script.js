const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const envelope = document.getElementById("envelope");
const wrap = document.getElementById("invitationWrap");
const form = document.getElementById("rsvpForm");
const guestPick = document.getElementById("guestPick");
const brojOsoba = document.getElementById("brojOsoba");
const positive = document.querySelector('[data-value="Dolazim"]');
const negative = document.querySelector('[data-value="Ne dolazim"]');

envelope.onclick = () => {
    envelope.classList.add("open");
    setTimeout(() => { envelope.style.display = "none"; wrap.classList.add("show") }, 700);
};

function updateButtons(n) {
    positive.textContent = n > 1 ? "DOLAZIMO" : "DOLAZIM";
    negative.textContent = n > 1 ? "NISMO U MOGUĆNOSTI" : "NISAM U MOGUĆNOSTI";
}

function setupGuests(max) {
    if (max <= 1) return;
    guestPick.style.display = "block";
    for (let i = 1; i <= max; i++) {
        const l = document.createElement("label");
        l.className = "guest-option";
        const r = document.createElement("input");
        r.type = "radio"; r.name = "g"; r.checked = i === 1;
        r.onchange = () => { brojOsoba.value = i; updateButtons(i) };
        const s = document.createElement("span");
        s.textContent = i === 1 ? "1 GOST" : `${i} GOSTA`;
        l.append(r, s); guestPick.append(l);
    }
}

updateButtons(1);
setupGuests(4); // TEST, realno dolazi iz backend-a
