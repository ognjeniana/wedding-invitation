const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const envelope = document.getElementById("envelope");
const invitationWrap = document.getElementById("invitationWrap");

const form = document.getElementById("rsvpForm");
const thankYou = document.getElementById("thankYou");
const centerInfo = document.getElementById("centerInfo");

const odgovorInput = document.getElementById("odgovor");
const submitBtn = document.getElementById("submitBtn");
const rsvpButtons = document.getElementById("rsvpButtons");
const choiceButtons = document.querySelectorAll(".choice");

const tokenInput = document.getElementById("token");
const brojOsobaEl = document.getElementById("brojOsoba");
const koDolaziEl = document.getElementById("koDolazi");
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
    if (rsvpButtons) rsvpButtons.style.display = "none";
    if (submitBtn) submitBtn.classList.add("hidden");
    if (centerInfo) centerInfo.style.display = "block";
    setConfirmMessage(msg);
}

function fillGuestsSelect(maxGuests) {
    brojOsobaEl.innerHTML = "";
    for (let i = 1; i <= maxGuests; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = String(i);
        brojOsobaEl.appendChild(opt);
    }
}

async function validateTokenAndSetup() {
    const t = getTokenFromUrl();

    if (!t) {
        showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
        return;
    }

    tokenInput.value = t;

    try {
        // cache-buster da ne kešira odgovor
        const url = `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(t)}&_=${Date.now()}`;

        const res = await fetch(url, { method: "GET" });
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            // ako nije JSON, znači Apps Script vraća HTML (permission ili error)
            showBlocked("Greška pri provjeri linka (nije JSON). Provjeri da je Web App access = Anyone.");
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

        const maxGuests = Number(data.maxGuests || 1);
        fillGuestsSelect(Number.isFinite(maxGuests) && maxGuests >= 1 ? maxGuests : 1);

        // ako je sve OK, forma treba da bude vidljiva
        form.style.display = "flex";
        setConfirmMessage("Molimo vas da potvrdite dolazak");

    } catch (e) {
        showBlocked("Došlo je do greške. Pokušajte ponovo kasnije.");
    }
}

/* klik -> koverta sklizne lijevo + pokaži pozivnicu */
envelope?.addEventListener("click", () => {
    envelope.classList.add("open");
    setTimeout(() => {
        envelope.style.display = "none";
        invitationWrap.classList.add("show");
    }, 760);
});

/* izbor dolazim/ne dolazim -> sakrij oba, pokaži submit */
choiceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        odgovorInput.value = btn.dataset.value;
        rsvpButtons.style.display = "none";
        submitBtn.classList.remove("hidden");
    });
});

/* slanje (FormData -> bez JSON headera -> nema preflight) */
form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("token", tokenInput.value);
    formData.append("fullName", nameInput.value);
    formData.append("odgovor", odgovorInput.value);
    formData.append("brojOsoba", brojOsobaEl.value);
    formData.append("koDolazi", koDolaziEl.value);

    try {
        const res = await fetch(SCRIPT_URL, {
            method: "POST",
            body: formData
        });

        const text = await res.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch {
            // čak i ako ne vrati JSON, mi možemo tretirati kao uspjeh
            // ali bolje je da vraća JSON - tvoj Apps Script vraća JSON.
            data = { ok: true };
        }

        if (!data.ok) {
            setConfirmMessage(data.error || "Greška pri slanju.");
            return;
        }

        form.style.display = "none";
        centerInfo.style.display = "none";

        thankYou.classList.remove("hidden");
        thankYou.classList.add("show");

    } catch (err) {
        setConfirmMessage("Greška pri slanju. Pokušajte ponovo.");
    }
});

/* validacija tokena odmah na učitavanje */
validateTokenAndSetup();
