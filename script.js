// ===== KONFIGURACIJA =====
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

const brojOsobaEl = document.getElementById("brojOsoba");
const guestPick = document.getElementById("guestPick");

const choiceButtons = document.querySelectorAll(".choice");
const positiveBtn = document.querySelector('.choice[data-value="Dolazim"]');
const negativeBtn = document.querySelector('.choice[data-value="Ne dolazim"]');

const nameInput = form ? form.querySelector('input[name="ime"]') : null;

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
    setConfirmMessage(msg);
}

function guestLabel(n) {
    return n === 1 ? "1 GOST" : `${n} GOSTA`;
}

function updateButtonTexts(guestCount) {
    const n = Number(guestCount) || 1;
    if (positiveBtn) positiveBtn.textContent = n > 1 ? "DOLAZIMO" : "DOLAZIM";
    if (negativeBtn) negativeBtn.textContent = n > 1 ? "NISMO U MOGUĆNOSTI" : "NISAM U MOGUĆNOSTI";
}

// ===== POČETNI TEKST (PRIJE FORME) =====
setConfirmMessage("Molimo Vas da nam potvrdite dolazak do 30.03.2026.");

// ===== BROJ GOSTIJU =====
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
}

// ===== VALIDACIJA TOKENA =====
async function validateTokenAndSetup() {
    const t = getTokenFromUrl();

    if (!t) {
        showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
        return;
    }

    if (tokenInput) tokenInput.value = t;

    try {
        const url = `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(t)}&_=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            showBlocked("Greška pri provjeri linka.");
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

        if (data.fullName && nameInput) {
            nameInput.value = data.fullName;
            nameInput.readOnly = true;
        }

        setupBrojOsoba(data.maxGuests);

        if (form) form.style.display = "flex";

    } catch (e) {
        showBlocked("Došlo je do greške. Pokušajte ponovo kasnije.");
    }
}

// ===== ANIMACIJA KOVERTE =====
envelope?.addEventListener("click", () => {
    envelope.classList.add("open");
    setTimeout(() => {
        envelope.style.display = "none";
        invitationWrap?.classList.add("show");
    }, 760);
});

// ===== SLANJE ODGOVORA =====
choiceButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const odgovor = btn.dataset.value || "";
        if (odgovorInput) odgovorInput.value = odgovor;

        choiceButtons.forEach((b) => (b.disabled = true));

        const body = new URLSearchParams();
        body.set("token", tokenInput.value);
        body.set("fullName", nameInput?.value || "");
        body.set("odgovor", odgovor);
        body.set("brojOsoba", brojOsobaEl?.value || "1");

        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: body.toString(),
            });

            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch { }

            if (!data || !data.ok) {
                choiceButtons.forEach((b) => (b.disabled = false));
                setConfirmMessage("Greška pri slanju.");
                return;
            }

            if (form) form.style.display = "none";
            if (centerInfo) centerInfo.style.display = "none";

            if (thankYou) {
                thankYou.textContent =
                    odgovor === "Dolazim"
                        ? "Hvala vam na odgovoru. Radujemo se vašem dolasku."
                        : "Hvala vam na odgovoru. Razumijemo i šaljemo zagrljaj.";
                thankYou.classList.remove("hidden");
                thankYou.classList.add("show");
            }

        } catch {
            choiceButtons.forEach((b) => (b.disabled = false));
            setConfirmMessage("Greška pri slanju. Pokušajte ponovo.");
        }
    });
});

// ===== START =====
validateTokenAndSetup();
