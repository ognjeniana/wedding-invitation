// 1) OVDJE UPIŠI TVOJ TAČAN /exec LINK
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const envelope = document.getElementById("envelope");
const invitationWrap = document.getElementById("invitationWrap");

const form = document.getElementById("rsvpForm");
const thankYou = document.getElementById("thankYou");
const centerInfo = document.getElementById("centerInfo");

const odgovorInput = document.getElementById("odgovor");
const rsvpButtons = document.getElementById("rsvpButtons");
const choiceButtons = document.querySelectorAll(".choice");

const tokenInput = document.getElementById("token");
const brojOsobaEl = document.getElementById("brojOsoba");
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
    // sakrij formu i dugmad
    if (form) form.style.display = "none";
    if (rsvpButtons) rsvpButtons.style.display = "none";

    // prikaži samo poruku
    if (centerInfo) centerInfo.style.display = "block";
    setConfirmMessage(msg);
}

function setupBrojOsoba(maxGuests) {
    const mg = Number(maxGuests || 1);

    // maxGuests <= 1 -> ne prikazuj dropdown, automatski 1
    if (!Number.isFinite(mg) || mg <= 1) {
        brojOsobaEl.style.display = "none";
        brojOsobaEl.innerHTML = "";

        const opt1 = document.createElement("option");
        opt1.value = "1";
        opt1.textContent = "1";
        brojOsobaEl.appendChild(opt1);
        brojOsobaEl.value = "1";
        return;
    }

    // maxGuests >= 2 -> prikaži dropdown 1..mg
    brojOsobaEl.style.display = "block";
    brojOsobaEl.innerHTML = "";

    for (let i = 1; i <= mg; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = String(i);
        brojOsobaEl.appendChild(opt);
    }

    brojOsobaEl.value = "1";
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
    btn.addEventListener("click", async () => {
        const odgovor = btn.dataset.value;
        odgovorInput.value = odgovor;

        // disable dugmad odmah da ne klikću više puta
        choiceButtons.forEach(b => b.disabled = true);

        const broj = (brojOsobaEl.style.display === "none") ? "1" : brojOsobaEl.value;

        const formData = new FormData();
        formData.append("token", tokenInput.value);
        formData.append("fullName", nameInput.value);
        formData.append("odgovor", odgovor);
        formData.append("brojOsoba", broj);

        try {
            const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });

            const text = await res.text();
            let data = { ok: true };
            try { data = JSON.parse(text); } catch { }

            if (!data.ok) {
                // vrati dugmad ako je greška (npr. već poslato)
                choiceButtons.forEach(b => b.disabled = false);
                setConfirmMessage(data.error || "Greška pri slanju.");
                return;
            }

            // sakrij formu i tekst potvrde
            form.style.display = "none";
            centerInfo.style.display = "none";

            // poruka zavisi od izbora
            if (odgovor === "Dolazim") {
                thankYou.textContent = "Hvala vam na odgovoru. Radujemo se vašem dolasku.";
            } else {
                thankYou.textContent = "Žao nam je što nećete moći prisustvovati.";
            }

            thankYou.classList.remove("hidden");
            thankYou.classList.add("show");

        } catch (err) {
            console.log("POST ERROR:", err);
            choiceButtons.forEach(b => b.disabled = false);
            setConfirmMessage("Greška pri slanju. Pokušajte ponovo.");
        }
    });
});

// pokreni validaciju odmah na učitavanje
validateTokenAndSetup();
