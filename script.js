const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const CONFIRM_TEXT = "Molimo Vas da nam potvrdite dolazak do 30.03.2026.";

function getParams() {
    return new URLSearchParams(window.location.search);
}

function getTokenFromUrl() {
    const params = getParams();
    return (params.get("t") || "").trim();
}

// ✅ NEW: ime iz linka (instant)
function getNameFromUrl() {
    const params = getParams();
    return (params.get("n") || "").trim();
}

function guestLabel(n) {
    return n === 1 ? "1 GOST" : `${n} GOSTA`;
}

window.addEventListener("DOMContentLoaded", () => {
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

    function setConfirmMessage(msg) {
        const confirm = centerInfo?.querySelector(".confirm");
        if (confirm) confirm.textContent = msg;
    }

    function lockForm(isLocked) {
        if (!form) return;
        const inputs = form.querySelectorAll("input, button");
        inputs.forEach((el) => {
            if (el.type === "hidden") return;
            el.disabled = isLocked;
        });
        choiceButtons.forEach((b) => (b.disabled = isLocked));
    }

    function showBlocked(msg) {
        if (form) form.style.display = "none";
        if (guestPick) guestPick.style.display = "none";
        lockForm(true);
        setConfirmMessage(msg);
    }

    function updateButtonTexts(guestCount) {
        const n = Number(guestCount) || 1;
        if (positiveBtn) positiveBtn.textContent = n > 1 ? "DOLAZIMO" : "DOLAZIM";
        if (negativeBtn) negativeBtn.textContent = n > 1 ? "NISMO U MOGUĆNOSTI" : "NISAM U MOGUĆNOSTI";
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

    // --- envelope open ---
    if (envelope && invitationWrap) {
        envelope.addEventListener("click", () => {
            envelope.classList.add("open");
            setTimeout(() => {
                envelope.style.display = "none";
                invitationWrap.classList.add("show");
            }, 760);
        });
    }

    // --- initial ---
    setConfirmMessage(CONFIRM_TEXT);

    // ✅ NEW: forma odmah vidljiva (bez čekanja)
    if (form) form.style.display = "flex";
    lockForm(false);

    // ✅ NEW: odmah postavi token u hidden
    const token = getTokenFromUrl();
    if (tokenInput) tokenInput.value = token;

    // ✅ NEW: odmah upiši ime (prioritet: URL param n, pa localStorage)
    if (nameInput) {
        const nameFromUrl = getNameFromUrl();
        const nameFromCache = token ? (localStorage.getItem("rsvp_name_" + token) || "") : "";
        const immediateName = nameFromUrl || nameFromCache;

        if (immediateName) {
            nameInput.value = immediateName;
            nameInput.readOnly = true;
        } else {
            nameInput.readOnly = false; // ako nema, neka može odmah ukucati
        }

        // BITNO: više ga NE skrivamo
        nameInput.classList.remove("loading-name");
    }

    async function validateTokenAndSetup() {
        const t = getTokenFromUrl();

        if (!t) {
            showBlocked("Link nije važeći. Molimo kontaktirajte mladence.");
            return;
        }

        try {
            const url = `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(t)}&_=${Date.now()}`;
            const res = await fetch(url);
            const text = await res.text();

            let data;
            try { data = JSON.parse(text); } catch {
                showBlocked("Greška: provjera linka ne radi (Web App access / deploy).");
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

            // ✅ NEW: kad stigne validacija, samo uskladi ime (bez čekanja korisnika)
            if (nameInput) {
                if (data.fullName) {
                    nameInput.value = data.fullName;
                    nameInput.readOnly = true;
                    localStorage.setItem("rsvp_name_" + t, data.fullName); // keš za instant sljedeći put
                } else {
                    // ako nema fullName u sheetu, ostavi kako je
                    if (!nameInput.value) nameInput.readOnly = false;
                }
                nameInput.classList.remove("loading-name");
            }

            setupBrojOsoba(data.maxGuests);

            // forma ostaje enabled (kao i do sad)
            lockForm(false);
            setConfirmMessage(CONFIRM_TEXT);

        } catch (e) {
            console.log("VALIDATE ERROR:", e);
            // ne blokiramo odmah ako mreža kasni, ali možeš po želji:
            // setConfirmMessage("Provjera linka kasni. Pokušajte ponovo.");
        }
    }

    // --- submit buttons (GET action=submit) ---
    choiceButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const odgovor = btn.dataset.value || "";
            if (odgovorInput) odgovorInput.value = odgovor;

            const originalText = btn.textContent;
            btn.textContent = "⏳";
            choiceButtons.forEach((b) => (b.disabled = true));

            if (form) form.style.display = "none";
            if (centerInfo) centerInfo.style.display = "none";

            if (thankYou) {
                thankYou.textContent =
                    (odgovor === "Dolazim")
                        ? "Hvala Vam na odgovoru. Radujemo se Vašem dolasku."
                        : "Hvala Vam na odgovoru. Žao nam je što nećete biti u mogućnosti da prisustvujete.";
                thankYou.classList.remove("hidden");
                thankYou.classList.add("show");
            }

            const brojZaSlanje = (odgovor === "Dolazim") ? (brojOsobaEl?.value || "1") : "0";

            try {
                const submitUrl =
                    `${SCRIPT_URL}?action=submit` +
                    `&token=${encodeURIComponent(tokenInput?.value || "")}` +
                    `&fullName=${encodeURIComponent(nameInput?.value || "")}` +
                    `&odgovor=${encodeURIComponent(odgovor)}` +
                    `&brojOsoba=${encodeURIComponent(brojZaSlanje)}` +
                    `&_=${Date.now()}`;

                const res = await fetch(submitUrl);
                const text = await res.text();

                let data = null;
                try { data = JSON.parse(text); } catch { }
                if (!data || !data.ok) throw new Error(data?.error || "Server error");

            } catch (err) {
                console.log("SUBMIT ERROR:", err);

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

    validateTokenAndSetup();
});
