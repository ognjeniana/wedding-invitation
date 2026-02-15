const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxcH7acVet5na_Fl5gJZzAkweQsRY72iMp7etkAQPksLLjiwiU3qr5qCdAfUjBGXhXJ/exec";

const CONFIRM_TEXT = "Molimo Vas da nam potvrdite dolazak do 30.03.2026.";

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("t") || "").trim();
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
    const nameInput = form ? form.querySelector('input[name="ime"]') : null;

    const token = getTokenFromUrl();

    // 🔒 HARD STOP — nikad refresh stranice
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }

    // 🔒 Ako je već poslao ranije (lokalno)
    if (token && localStorage.getItem("rsvp_submitted_" + token) === "1") {
        if (form) form.style.display = "none";
        if (guestPick) guestPick.style.display = "none";
        if (centerInfo) centerInfo.style.display = "none";
        if (thankYou) {
            thankYou.textContent = "Odgovor je već poslat za ovaj link.";
            thankYou.classList.remove("hidden");
            thankYou.classList.add("show");
        }
        return;
    }

    // --- Otvaranje koverte ---
    if (envelope && invitationWrap) {
        envelope.addEventListener("click", () => {
            envelope.classList.add("open");
            setTimeout(() => {
                envelope.style.display = "none";
                invitationWrap.classList.add("show");
            }, 760);
        });
    }

    // --- Forma odmah vidljiva ---
    if (form) form.style.display = "flex";
    if (tokenInput) tokenInput.value = token;

    // --- VALIDATE (u pozadini) ---
    validateToken();

    async function validateToken() {
        if (!token) return;

        try {
            const res = await fetch(
                `${SCRIPT_URL}?action=validate&t=${encodeURIComponent(token)}&_=${Date.now()}`
            );

            const data = await res.json();

            if (!data.ok) {
                block("Link nije važeći.");
                return;
            }

            if (data.used) {
                block("Odgovor je već poslat za ovaj link.");
                return;
            }

            if (nameInput && data.fullName) {
                nameInput.value = data.fullName;
                nameInput.readOnly = true;
            }

            setupGuests(data.maxGuests);

        } catch (e) {
            console.log("VALIDATE ERROR:", e);
        }
    }

    function block(msg) {
        if (form) form.style.display = "none";
        if (guestPick) guestPick.style.display = "none";
        if (centerInfo) centerInfo.style.display = "none";

        if (thankYou) {
            thankYou.textContent = msg;
            thankYou.classList.remove("hidden");
            thankYou.classList.add("show");
        }
    }

    function setupGuests(maxGuests) {
        if (!guestPick || !brojOsobaEl) return;

        guestPick.innerHTML = "";

        if (!maxGuests || maxGuests <= 1) {
            guestPick.style.display = "none";
            return;
        }

        guestPick.style.display = "block";

        for (let i = 1; i <= maxGuests; i++) {
            const label = document.createElement("label");
            label.className = "guest-option";

            const input = document.createElement("input");
            input.type = "radio";
            input.name = "guestCount";
            input.value = String(i);
            if (i === 1) input.checked = true;

            input.addEventListener("change", () => {
                brojOsobaEl.value = String(i);
            });

            const span = document.createElement("span");
            span.textContent = i === 1 ? "1 GOST" : `${i} GOSTA`;

            label.appendChild(input);
            label.appendChild(span);
            guestPick.appendChild(label);
        }
    }

    // --- SUBMIT ---
    choiceButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const odgovor = btn.dataset.value || "";
            if (odgovorInput) odgovorInput.value = odgovor;

            const broj =
                odgovor === "Dolazim"
                    ? brojOsobaEl?.value || "1"
                    : "0";

            // UI odmah
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

            try {
                const url =
                    `${SCRIPT_URL}?action=submit` +
                    `&token=${encodeURIComponent(token)}` +
                    `&fullName=${encodeURIComponent(nameInput?.value || "")}` +
                    `&odgovor=${encodeURIComponent(odgovor)}` +
                    `&brojOsoba=${encodeURIComponent(broj)}` +
                    `&_=${Date.now()}`;

                const res = await fetch(url);
                const data = await res.json();

                if (!data.ok) throw new Error(data.error);

                // 🔒 lokalna blokada
                localStorage.setItem("rsvp_submitted_" + token, "1");

            } catch (err) {
                console.log("SUBMIT ERROR:", err);
            }
        });
    });

});
