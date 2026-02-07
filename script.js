// 1) OVDJE UPIŠI TVOJ TAČAN /exec LINK (Google Apps Script Web App)
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

// ===== ELEMENTI =====
const envelope = document.getElementById("envelope");
const invitationWrap = document.getElementById("invitationWrap");

const form = document.getElementById("rsvpForm");
const thankYou = document.getElementById("thankYou");
const centerInfo = document.getElementById("centerInfo");

const odgovorInput = document.getElementById("odgovor");
const tokenInput = document.getElementById("token");

const brojOsobaEl = document.getElementById("brojOsoba"); // hidden
const guestPick = document.getElementById("guestPick");

const choiceButtons = document.querySelectorAll(".choice");
const positiveBtn = document.querySelector('.choice[data-value="Dolazim"]');
const negativeBtn = document.querySelector('.choice[data-value="Ne dolazim"]');

const nameInput = form ? form.querySelector('input[name="ime"]') : null;

// ===== TEKST =====
const CONFIRM_TEXT = "Molimo Vas da nam potvrdite dolazak do 30.03.2026.";

// ===== STATE =====
let validateStarted = false;

// ===== HELPERS =====
function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("t") || "").trim();
}

function setConfirmMessage(msg) {
    const confirm = centerInfo?.querySelector(".confirm");
    if (confirm) confirm.textContent = msg;
}

function showBlocked(msg) {
    if (form) form.style.display = "none";
    if (guestPick) guestPick.style.display = "none";
    choiceButtons.forEach((b) => (b.disabled = true));
    setConfirmMessage(msg);
}

function guestLabel(n) {
    return n === 1 ? "1 GOST" : `${n} GOSTA`;
}

function updateButtonTexts(guestCount) {
    const n = Number(guestCount) || 1;
    if (positiveBtn) positiveBtn.textContent = n > 1 ? "DOLAZIMO" : "DOLAZIM";
    if (negativeBtn)
        negativeBtn.textContent = n > 1 ? "NISMO U MOGUĆNOSTI" : "NISAM U MOGUĆNOSTI";
}

function setupBrojOsoba(maxGuests) {
    const mg = Number(maxGuests || 1);

    if (brojOsobaEl) brojOsobaEl.value = "1";
    updateButtonTexts(1);

    if (!guestPick || !brojOsobaEl) return;

    guestPick.innerHTML = "";

    if (!Number.isFinite(mg) || mg <= 1) {
        guestPick.style.display = "none";
        return;
    }

    guestPick.style.display = "block";

    for (let i = 1; i <= mg; i++) {
        const label = document.createElement("label");
        label.className = "guest-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "guestCount";
        input.value = String(i);
        if (i === 1) input.checked = true;

        input.addEventListener("change", () => {
            brojOsobaEl.value = String(i);
            updateButtonTexts(i);
        });

        const span = document.createElement("span");
        span.textContent = guestLabel(i);

        label.appendChild(input);
        label.appendChild(span);
        guestPick.appendChild(label);
    }

    updateButtonTexts(brojOsobaEl?.value || "1");
}

function showRsvpInstantLoading() {
    // ✅ forma se vidi odmah, ali dugmad disabled dok ne stigne validate
    if (form) form.style.display = "flex";
    choiceButtons.forEach((b) => (b.disabled = true));
    setConfirmMessage(CONFIRM_TEXT);

    if (nameInput) {
        nameInput.classList.remove("loading-name");
        nameInput.value = "";
        nameInput.placeholder = "Učitavanje imena…";
        nameInput.readOnly = true;
    }

    // default bez guest pickera dok ne dobijemo maxGuests
    if (guestPick) guestPick.style.display = "none";
    if (brojOsobaEl) brojOsobaEl.value = "1";
    updateButtonTexts(1);
}

// ===== VALIDACIJA TOKENA =====
async function validateTokenAndSetup() {
    if (validateStarted) return;
    validateStarted = true;

    const t = getTokenFromUrl();

    if (!t) {
        showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
        return;
    }

    if (tokenInput) tokenInput.value = t;

    // ✅ pokaži RSVP odmah (loading state)
    showRsvpInstantLoading();

    try {
        const url = `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(t)}&_=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.log("VALIDATE RESPONSE (not JSON):", text);
            showBlocked("Greška: provjera linka ne radi (pogrešan /exec link ili Web App access).");
            return;
        }

        if (!data.ok) {
            showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
            return;
        }

        if (data.used) {
            showBlocked("Odgovor je već poslat za ovaj link.");
            return;
        }

        // ✅ ime: kad stigne, samo upiši
        if (nameInput) {
            if (data.fullName) {
                nameInput.value = data.fullName;
                nameInput.readOnly = true;
            } else {
                nameInput.value = "";
                nameInput.placeholder = "Ime i prezime";
                nameInput.readOnly = false;
            }
        }

        setupBrojOsoba(data.maxGuests);

        // ✅ otključaj dugmad tek kad je sve spremno
        choiceButtons.forEach((b) => (b.disabled = false));
        setConfirmMessage(CONFIRM_TEXT);
    } catch (e) {
        console.log("VALIDATE ERROR:", e);
        showBlocked("Došlo je do greške pri provjeri linka. Pokušajte ponovo kasnije.");
    }
}

// ===== ANIMACIJA KOVERTE + PARALELNO VALIDATE =====
envelope?.addEventListener("click", () => {
    envelope.classList.add("open");

    // 🚀 odmah kreni sa validate (dok traje animacija)
    validateTokenAndSetup();

    setTimeout(() => {
        envelope.style.display = "none";
        invitationWrap?.classList.add("show");
    }, 760);
});

// ===== SLANJE ODGOVORA (INSTANT + MINI SPINNER) =====
choiceButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const odgovor = btn.dataset.value || "";
        if (odgovorInput) odgovorInput.value = odgovor;

        const originalText = btn.textContent;

        // mini spinner na kliknutom dugmetu
        btn.textContent = "⏳";
        choiceButtons.forEach((b) => (b.disabled = true));

        // instant prikaz poruke
        if (form) form.style.display = "none";
        if (centerInfo) centerInfo.style.display = "none";

        if (thankYou) {
            thankYou.textContent =
                odgovor === "Dolazim"
                    ? "Hvala Vam na odgovoru. Radujemo se Vašem dolasku."
                    : "Hvala Vam na odgovoru. Žao nam je što nećete biti u mogućnosti da prisustvujete.";
            thankYou.classList.remove("hidden");
            thankYou.classList.add("show");
        }

        // ✅ broj gostiju: ako ne dolazi -> 0, ako dolazi -> izabrano (min 1)
        const brojZaSlanje = (odgovor === "Dolazim") ? (brojOsobaEl?.value || "1") : "0";

        const body = new URLSearchParams();
        body.set("token", tokenInput?.value || "");
        body.set("fullName", nameInput?.value || "");
        body.set("odgovor", odgovor);
        body.set("brojOsoba", brojZaSlanje);

        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: body.toString(),
            });

            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch { }

            if (!data || !data.ok) throw new Error(data?.error || "Server error");

            // uspjeh: ništa ne diramo, poruka već stoji instant
        } catch (err) {
            console.log("POST ERROR:", err);

            // vrati UI da može ponovo
            if (thankYou) {
                thankYou.classList.add("hidden");
                thankYou.classList.remove("show");
            }

            btn.textContent = originalText;
            if (centerInfo) centerInfo.style.display = "block";
            if (form) form.style.display = "flex";
            choiceButtons.forEach((b) => (b.disabled = false));

            setConfirmMessage("Žao nam je, došlo je do greške. Molimo pokušajte ponovo.");
            setTimeout(() => setConfirmMessage(CONFIRM_TEXT), 3500);
        }
    });
});
