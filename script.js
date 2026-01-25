const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyiFSWUMElBqSaXtbAe6YGtfyZzhzIKQaIXpZSTd4ZylGwqJuxGCjUwLu18v6sczWM0/exec";

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
    // sakrij RSVP formu
    if (form) form.style.display = "none";
    // sakrij i submit/dugmad ako su negdje ostali
    if (rsvpButtons) rsvpButtons.style.display = "none";
    if (submitBtn) submitBtn.classList.add("hidden");

    // pokaži poruku u postojećem tekstu na pozivnici
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
        const url = `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(t)}`;
        const res = await fetch(url, { method: "GET" });
        const data = await res.json();

        if (!data.ok) {
            showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
            return;
        }

        if (data.used) {
            showBlocked("Odgovor je već poslat za ovaj link.");
            return;
        }

        // ime iz Sheeta + zaključaj
        if (data.fullName) {
            nameInput.value = data.fullName;
            nameInput.readOnly = true;
        }

        const maxGuests = Number(data.maxGuests || 1);
        fillGuestsSelect(Number.isFinite(maxGuests) && maxGuests >= 1 ? maxGuests : 1);

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

/* slanje */
form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        token: tokenInput.value,
        fullName: nameInput.value,
        odgovor: odgovorInput.value,
        brojOsoba: brojOsobaEl.value,
        koDolazi: koDolaziEl.value
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

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
