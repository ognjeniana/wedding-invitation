// script.js

// 1) OVDJE UPIŠI TVOJ TAČAN /exec LINK (Google Apps Script Web App)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const envelope = document.getElementById("envelope");
const invitationWrap = document.getElementById("invitationWrap");

const form = document.getElementById("rsvpForm");
const thankYou = document.getElementById("thankYou");
const centerInfo = document.getElementById("centerInfo");

const odgovorInput = document.getElementById("odgovor");
const choiceButtons = document.querySelectorAll(".choice");

const tokenInput = document.getElementById("token");

// broj osoba (hidden) + chip UI
const brojOsobaEl = document.getElementById("brojOsoba");
const guestPick = document.getElementById("guestPick");

const nameInput = form.querySelector('input[name="ime"]');

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
    if (centerInfo) centerInfo.style.display = "block";
    setConfirmMessage(msg);
}

function guestLabel(n) {
    // traženo: "2 GOSTA", "3 GOSTA", "4 GOSTA"
    // (za 1: "1 GOST")
    return n === 1 ? "1 GOST" : `${n} GOSTA`;
}

function setupBrojOsoba(maxGuests) {
    const mg = Number(maxGuests || 1);
    brojOsobaEl.value = "1";

    if (!guestPick) return;

    if (!Number.isFinite(mg) || mg <= 1) {
        guestPick.style.display = "none";
        guestPick.innerHTML = "";
        return;
    }

    guestPick.style.display = "flex";
    guestPick.innerHTML = "";

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
            updateNegativeButtonText(i);
        });

        const text = document.createElement("span");
        text.textContent = i === 1 ? "1 GOST" : `${i} GOSTA`;

        label.appendChild(input);
        label.appendChild(text);
        guestPick.appendChild(label);
    }

    updateNegativeButtonText(1);
}


async function validateTokenAndSetup() {
    const t = getTokenFromUrl();

    if (!t) {
        showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
        return;
    }

    tokenInput.value = t;

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

        if (data.fullName) {
            nameInput.value = data.fullName;
            nameInput.readOnly = true;
        }

        setupBrojOsoba(data.maxGuests);

        // prikaži formu i standardnu poruku
        form.style.display = "flex";
        setConfirmMessage("Molimo vas da potvrdite dolazak");

    } catch (e) {
        console.log("VALIDATE ERROR:", e);
        showBlocked("Došlo je do greške pri provjeri linka. Pokušajte ponovo kasnije.");
    }
}

/* KOVERAT -> POZIVNICA */
envelope?.addEventListener("click", () => {
    envelope.classList.add("open");
    setTimeout(() => {
        envelope.style.display = "none";
        invitationWrap.classList.add("show");
    }, 760);
});

/* Klik na Dolazim/Ne dolazim -> ODMAH šalje */
choiceButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const odgovor = btn.dataset.value;
        odgovorInput.value = odgovor;

        // disable odmah
        choiceButtons.forEach((b) => (b.disabled = true));

        const broj = (brojOsobaEl.value || "1");

        const body = new URLSearchParams();
        body.set("token", tokenInput.value);
        body.set("fullName", nameInput.value);
        body.set("odgovor", odgovor);
        body.set("brojOsoba", broj);

        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: body.toString(),
            });

            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch { }

            if (!data) {
                console.log("POST RESPONSE (not JSON):", text);
                choiceButtons.forEach((b) => (b.disabled = false));
                setConfirmMessage("Greška: server nije vratio JSON odgovor.");
                return;
            }

            if (!data.ok) {
                choiceButtons.forEach((b) => (b.disabled = false));
                setConfirmMessage(data.error || "Greška pri slanju.");
                return;
            }

            // sakrij formu i tekst potvrde
            form.style.display = "none";
            centerInfo.style.display = "none";

            // poruka zavisi od izbora
            thankYou.textContent =
                (odgovor === "Dolazim")
                    ? "Hvala vam na odgovoru. Radujemo se vašem dolasku."
                    : "Žao nam je što nećete moći prisustvovati.";

            thankYou.classList.remove("hidden");
            thankYou.classList.add("show");
            const negativeBtn = document.querySelector(".choice.negative");

            function updateNegativeButtonText(guestCount) {
                if (!negativeBtn) return;
                negativeBtn.textContent =
                    Number(guestCount) > 1
                        ? "NISMO U MOGUĆNOSTI"
                        : "NISAM U MOGUĆNOSTI";
            }

        } catch (err) {
            console.log("POST ERROR:", err);
            choiceButtons.forEach((b) => (b.disabled = false));
            setConfirmMessage("Greška pri slanju. Pokušajte ponovo.");
        }
    });
});

// pokreni validaciju odmah na učitavanje
validateTokenAndSetup();
