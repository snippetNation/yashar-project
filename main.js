class SiteHeader extends HTMLElement {
  connectedCallback() {
    fetch("templates/header.html")
      .then(res => res.text())
      .then(html => {
        // Clean up any injected scripts from live-server
        html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
        this.innerHTML = html;

        loadProjectsDropdown();

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
import validator from "https://cdn.jsdelivr.net/npm/validator@13.11.0/+esm";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11.10.0/src/sweetalert2.js";


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

      // --- Load projects into donation form ---
      await this.loadDonationProjects(root);

      // --- Load countries into country dropdown ---
      await this.loadCountries(root);

      // --- useful refs ---
      const amountInput = root.querySelector("#donation-amount");
      const amountGrid = root.querySelector(".grid.grid-cols-3") || root.querySelector(".grid");
      const donateBtn = root.querySelector("#donate-button");
      const cardInfo = root.querySelector("#card-info");
      const offlineInfo = root.querySelector("#offline-info");
      const form = root.querySelector("#donation-form");

      // --- Form Validation Setup ---
      this.setupFormValidation(root);

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
          // Validate amount on input
          this.validateField(amountInput, 'amount');
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

          // Validate entire form before proceeding
          if (!this.validateForm(root)) {
            this.showFormError("Please fix the errors in the form before submitting.");
            return;
          }

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
              Swal.fire({
                icon: 'warning',
                title: 'Incomplete Form',
                text: 'Please fill all Fields and ensure amount is a positive number.',
                confirmButtonColor: '#3085d6',
              });
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
              project, // Now including the project field
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
            Swal.fire({
              icon: 'success',
              title: 'Thank You!',
              text: 'Your donation was submitted. We will follow up with confirmation.',
              confirmButtonColor: '#3085d6',
            });

            // optional: reset form
            root.querySelector("form")?.reset();
            if (amountInput) amountInput.value = "0.00";
            if (amountGrid) {
              amountGrid.querySelectorAll("button").forEach(b => {
                b.classList.remove("border-yashar-blue", "bg-yashar-blue", "text-white");
                b.classList.add("border-gray-200");
              });
            }

            // Clear validation states
            this.clearValidationStates(root);

          } catch (err) {
            console.error("❌ donation error:", err);
            Swal.fire({
              icon: 'error',
              title: 'Submission Failed',
              text: 'Something went wrong saving your donation. Please try again.',
              confirmButtonColor: '#3085d6',
            });
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

  // NEW METHOD: Load countries from JSON file
  async loadCountries(root) {
    try {
      console.log('🔄 Loading countries...');

      // Fetch countries from JSON file
      const response = await fetch('countries.json'); // Adjust path as needed
      if (!response.ok) {
        throw new Error('Failed to load countries data');
      }

      const data = await response.json();
      const countries = data.countries;

      const countrySelect = root.querySelector('#donor-country');

      if (!countrySelect) {
        console.error('❌ Country select element not found');
        return;
      }

      // Clear existing options
      countrySelect.innerHTML = '';

      // Sort countries alphabetically by name
      countries.sort((a, b) => a.name.localeCompare(b.name));

      // Add default option at the top
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select your country';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      countrySelect.appendChild(defaultOption);

      // Add all countries as options
      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code; // Store country code as value
        option.textContent = country.name; // Show full country name
        option.setAttribute('data-code', country.code); // Store code as data attribute

        // Auto-select United States
        if (country.code === 'US') {
          option.selected = true;
        }

        countrySelect.appendChild(option);
      });

      console.log(`✅ Loaded ${countries.length} countries into dropdown`);

    } catch (error) {
      console.error('❌ Failed to load countries:', error);

      // Fallback to hardcoded options if JSON fails
      this.loadFallbackCountries(root);
    }
  }

  // Fallback method if JSON loading fails
  loadFallbackCountries(root) {
    const countrySelect = root.querySelector('#donor-country');
    if (!countrySelect) return;

    const fallbackCountries = [
      { name: 'United States', code: 'US' },
      { name: 'Canada', code: 'CA' },
      { name: 'United Kingdom', code: 'GB' },
      { name: 'Australia', code: 'AU' },
      { name: 'Germany', code: 'DE' },
      { name: 'France', code: 'FR' },
      { name: 'Japan', code: 'JP' },
      { name: 'Other', code: 'OTHER' }
    ];

    countrySelect.innerHTML = '';

    fallbackCountries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.code;
      option.textContent = country.name;
      if (country.code === 'US') option.selected = true;
      countrySelect.appendChild(option);
    });

    console.log('✅ Loaded fallback countries');
  }


  // FORM VALIDATION METHODS
  setupFormValidation(root) {
    // Add real-time validation to all required fields
    const requiredFields = [
      { id: 'donor-first', type: 'text', name: 'First Name' },
      { id: 'donor-last', type: 'text', name: 'Last Name' },
      { id: 'donor-email', type: 'email', name: 'Email' },
      { id: 'donor-phone', type: 'phone', name: 'Phone Number e.g +123 456 7890' },
      { id: 'donation-amount', type: 'amount', name: 'Donation Amount' },
      { id: 'donor-street-address', type: 'text', name: 'Street Address' },
      { id: 'donor-city', type: 'text', name: 'City' },
      { id: 'donor-state', type: 'text', name: 'State' },
      { id: 'donor-zip', type: 'zip', name: 'ZIP Code' },
      { id: 'card-number', type: 'card', name: 'Card Number' },
      { id: 'card-expiry', type: 'expiry', name: 'Card Expiry' },
      { id: 'card-cvv', type: 'cvv', name: 'CVV' }
    ];

    // Special handling for card number field
    const cardNumberField = root.querySelector('#card-number');
    if (cardNumberField) {
      // Create card type icon container
      const cardIconContainer = document.createElement('div');
      cardIconContainer.className = 'absolute right-3 top-1/2 transform -translate-y-1/2';
      cardIconContainer.id = 'card-type-icon';
      cardNumberField.parentNode.classList.add('relative');
      cardNumberField.parentNode.appendChild(cardIconContainer);

      // Auto-format on input
      cardNumberField.addEventListener('input', (e) => {
        this.formatCardNumberField(e.target);
        this.detectCardType(e.target.value);
        this.clearFieldError(e.target);
      });

      // Validate on blur
      cardNumberField.addEventListener('blur', () => this.validateField(cardNumberField, 'card'));

      // Set placeholder
      cardNumberField.placeholder = '1234 5678 9012 3456';

      // Keyboard restrictions
      cardNumberField.addEventListener('keydown', (e) => {
        // Allow navigation and deletion keys
        if ([8, 9, 37, 39, 46].includes(e.keyCode)) return;

        // Only allow numbers and spaces
        if (!/[0-9\s]/.test(e.key)) {
          e.preventDefault();
        }
      });
    }

    // Special handling for card expiry field
    const expiryField = root.querySelector('#card-expiry');
    if (expiryField) {
      expiryField.addEventListener('input', (e) => {
        this.formatExpiryField(e.target);
        this.clearFieldError(e.target);
      });
      expiryField.addEventListener('blur', () => this.validateField(expiryField, 'expiry'));

      // Set placeholder
      expiryField.placeholder = 'MM/YY';
    }

    requiredFields.forEach(field => {
      const element = root.querySelector(`#${field.id}`);
      if (element) {
        element.addEventListener('blur', () => this.validateField(element, field.type));
        element.addEventListener('input', () => this.clearFieldError(element));
      }
    });

    // Terms checkbox validation
    const termsCheckbox = root.querySelector('#terms');
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', () => this.validateTerms(termsCheckbox));
    }
  }

  formatCardNumberField(field) {
    let value = field.value.replace(/\D/g, ''); // Remove non-digits

    // Limit based on detected card type
    const cardType = this.detectCardType(value);
    const maxLength = this.getCardMaxLength(cardType);

    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }

    // Add spaces every 4 digits
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');

    field.value = value;
  }

  detectCardType(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    const cardIcon = document.getElementById('card-type-icon');

    // Card type patterns (first few digits)
    const cardPatterns = {
      visa: /^4/,
      mastercard: /^(5[1-5]|2[2-7])/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^(?:2131|1800|35)/
    };

    // Detect card type
    let detectedType = 'unknown';
    for (const [type, pattern] of Object.entries(cardPatterns)) {
      if (pattern.test(cleaned)) {
        detectedType = type;
        break;
      }
    }

    // Update card icon
    this.updateCardIcon(detectedType, cardIcon);

    return detectedType;
  }

  updateCardIcon(cardType, iconContainer) {
    // Clear previous icon
    iconContainer.innerHTML = '';

    const icons = {
      visa: `
      <svg class="w-8 h-8" viewBox="0 0 24 24">
        <path fill="#1a1f71" d="M9.6 15.4H7.3l1-5.7h2.3l-1 5.7zm5.1 0h-2.1l.4-2.2h-1.3l-.2 1.1h-2l.7-4.1h3.3l-.2 1.1h-1.1l-.2 1h1.4l-.2 1.1zm3.2-5.7h-2.1l-1.7 5.7h2.1l.3-.9h2l.2.9h2.3l-1.2-5.7zm-.2 3.6l.4-1.1c.1-.2.2-.5.3-.7.1.4.2.7.3 1l.4 1.8h-1.4zm3.9-3.6h2.2l-1.4 5.7h-2.1l1.3-5.7z"/>
        <path fill="#faa41a" d="M21.4 9.7h-2.2l1.3 5.7h2.1l-1.2-5.7z"/>
      </svg>
    `,
      mastercard: `
      <svg class="w-8 h-8" viewBox="0 0 24 24">
        <path fill="#ff5f00" d="M15.4 12.3c0-1.6-.9-3-2.2-3.8.9-.7 2-1.1 3.2-1.1 2.6 0 4.7 2.1 4.7 4.7s-2.1 4.7-4.7 4.7c-1.2 0-2.3-.4-3.2-1.1 1.3-.8 2.2-2.2 2.2-3.8z"/>
        <path fill="#eb001b" d="M9.8 8.5c-2.6 0-4.7 2.1-4.7 4.7s2.1 4.7 4.7 4.7c1.2 0 2.3-.4 3.2-1.1-1.3-.8-2.2-2.2-2.2-3.8s.9-3 2.2-3.8c-.9-.7-2-1.1-3.2-1.1z"/>
        <path fill="#f79e1b" d="M13 14.2c1.3-.8 2.2-2.2 2.2-3.8s-.9-3-2.2-3.8c-.9.7-1.5 1.7-1.5 2.9s.6 2.2 1.5 2.9z"/>
      </svg>
    `,
      amex: `
      <svg class="w-8 h-8" viewBox="0 0 24 24">
        <path fill="#016FD0" d="M2 6h20v12H2z"/>
        <path fill="#fff" d="M6.5 9.5h2v1h-2zm-3 0h2v1h-2zm12 0h2v1h-2zm-3 0h2v1h-2zM6.5 13.5h2v1h-2zm-3 0h2v1h-2zm12 0h2v1h-2zm-3 0h2v1h-2z"/>
        <path fill="#016FD0" d="M4 11h16v2H4z"/>
      </svg>
    `,
      discover: `
      <svg class="w-8 h-8" viewBox="0 0 24 24">
        <path fill="#ff6000" d="M2 6h20v12H2z"/>
        <path fill="#fff" d="M12 12l-2.5 2.5-1.5-1.5 4-4 4 4-1.5 1.5z"/>
      </svg>
    `,
      unknown: `
      <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
    `
    };

    const iconHTML = icons[cardType] || icons.unknown;
    iconContainer.innerHTML = iconHTML;
  }

  getCardMaxLength(cardType) {
    const maxLengths = {
      amex: 15,
      diners: 14,
      unknown: 19, // Default for most cards
      visa: 19,
      mastercard: 19,
      discover: 19,
      jcb: 19
    };

    return maxLengths[cardType] || 19;
  }

  // Enhanced card validation with Luhn algorithm
  isValidCardNumber(card) {
    const cleaned = card.replace(/\s/g, '');

    // Basic length check
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    // Luhn algorithm validation
    if (!this.luhnCheck(cleaned)) return false;

    return true;
  }

  luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  formatExpiryField(field) {
    let value = field.value.replace(/\D/g, ''); // Remove non-digits

    if (value.length > 4) {
      value = value.substring(0, 4); // Limit to 4 digits
    }

    // Auto-insert slash after 2 digits
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }

    field.value = value;

    // Auto-advance to next field if complete
    if (value.length === 5) { // MM/YY format complete
      const cvvField = field.closest('.space-y-3')?.querySelector('#card-cvv');
      if (cvvField) {
        cvvField.focus();
      }
    }
  }

  validateField(field, type) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Clear previous error
    this.clearFieldError(field);

    // Required field validation
    if (!value) {
      isValid = false;
      errorMessage = 'This field is required';
    } else {
      // Type-specific validation
      switch (type) {
        case 'email':
          if (!this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
          }
          break;

        case 'phone':
          if (!this.isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
          }
          break;

        case 'amount':
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            isValid = false;
            errorMessage = 'Please enter a valid donation amount';
          } else if (amount < 1) {
            isValid = false;
            errorMessage = 'Minimum donation amount is $1';
          }
          break;

        case 'card':
          if (!this.isValidCardNumber(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid card number';
          }
          break;

        case 'expiry':
          if (!this.isValidExpiry(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid expiry date (MM/YY)';
          }
          break;

        case 'cvv':
          if (!this.isValidCVV(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid CVV';
          }
          break;

        case 'zip':
          if (!this.isValidZip(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid ZIP code';
          }
          break;
      }
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    } else {
      this.showFieldSuccess(field);
    }

    return isValid;
  }

  validateTerms(checkbox) {
    const container = checkbox.closest('label');
    if (!container) return;

    // Clear previous state
    container.classList.remove('border-red-300', 'bg-red-50', 'border-green-300', 'bg-green-50');

    if (!checkbox.checked) {
      container.classList.add('border-red-300', 'bg-red-50');
      return false;
    } else {
      container.classList.add('border-green-300', 'bg-green-50');
      return true;
    }
  }

  validateForm(root) {
    let isValid = true;

    // Validate all required fields
    const fieldsToValidate = [
      { id: 'donor-first', type: 'text' },
      { id: 'donor-last', type: 'text' },
      { id: 'donor-email', type: 'email' },
      { id: 'donor-phone', type: 'phone' },
      { id: 'donation-amount', type: 'amount' },
      { id: 'donor-street-address', type: 'text' },
      { id: 'donor-city', type: 'text' },
      { id: 'donor-state', type: 'text' },
      { id: 'donor-zip', type: 'zip' }
    ];

    // Check payment method and validate card fields if needed
    const paymentMethod = root.querySelector('input[name="payment"]:checked')?.value;
    if (paymentMethod === 'card') {
      fieldsToValidate.push(
        { id: 'card-number', type: 'card' },
        { id: 'card-expiry', type: 'expiry' },
        { id: 'card-cvv', type: 'cvv' }
      );
    }

    fieldsToValidate.forEach(field => {
      const element = root.querySelector(`#${field.id}`);
      if (element && !this.validateField(element, field.type)) {
        isValid = false;
      }
    });

    // Validate terms
    const termsCheckbox = root.querySelector('#terms');
    if (termsCheckbox && !this.validateTerms(termsCheckbox)) {
      isValid = false;
    }

    return isValid;
  }

  // VALIDATION UTILITY METHODS
  isValidEmail(email) {
    return validator.isEmail(email);
  }

  isValidPhone(phone) {
    // allow international formats (+, spaces, dashes)
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    return validator.isMobilePhone(cleaned, 'any');
  }

  isValidCardNumber(card) {
    const cleaned = card.replace(/\s/g, '');
    return validator.isCreditCard(cleaned);
  }

  isValidExpiry(expiry) {
    // validator.js doesn’t have direct MM/YY expiry validation, 
    // but you can parse with regex + date check
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    const [mm, yy] = expiry.split('/').map(Number);
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    if (mm < 1 || mm > 12) return false;
    if (yy < currentYY || (yy === currentYY && mm < currentMM)) return false;
    return true;
  }

  isValidCVV(cvv) {
    return validator.isLength(cvv, { min: 3, max: 4 }) && validator.isNumeric(cvv);
  }

  isValidZip(zip) {
    // US ZIP example; validator also supports `isPostalCode`
    return validator.isPostalCode(zip, 'any');
  }

  // UI METHODS
  showFieldError(field, message) {
    this.clearFieldError(field);

    field.classList.add('border-red-500', 'bg-red-50');
    field.classList.remove('border-green-500', 'bg-green-50');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-600 text-xs mt-1 flex items-center';
    errorDiv.innerHTML = `
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${message}
    `;

    field.parentNode.appendChild(errorDiv);
    field.setAttribute('data-error', 'true');
  }

  showFieldSuccess(field) {
    this.clearFieldError(field);
    field.classList.remove('border-red-500', 'bg-red-50');
    field.classList.add('border-green-500', 'bg-green-50');
  }

  clearFieldError(field) {
    field.classList.remove('border-red-500', 'bg-red-50', 'border-green-500', 'bg-green-50');
    field.removeAttribute('data-error');

    const errorDiv = field.parentNode.querySelector('.text-red-600');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  clearValidationStates(root) {
    const fields = root.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      this.clearFieldError(field);
      field.classList.remove('border-green-500', 'bg-green-50');
    });

    // Clear terms validation
    const termsContainer = root.querySelector('#terms')?.closest('label');
    if (termsContainer) {
      termsContainer.classList.remove('border-red-300', 'bg-red-50', 'border-green-300', 'bg-green-50');
    }
  }

  showFormError(message) {
    // You could implement a toast notification system here
    Swal.fire({
      icon: 'error',
      title: 'Form Error',
      text: message,
      confirmButtonColor: '#3085d6',
    });
  }

  showSuccessMessage(message) {
    // You could implement a success toast notification here
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: message,
      confirmButtonColor: '#3085d6',
    });
  }

  // NEW METHOD: Load projects into donation form dropdown
  // This should be a class method, not inside connectedCallback
  async loadDonationProjects(root) {
    try {
      console.log('🔄 Loading projects for donation form...');

      // Get all projects from PocketBase
      const projects = await pb.collection('Projects').getFullList({
        sort: '-created',
        fields: 'id,title',
        requestKey: 'donation-form'
      });

      const projectSelect = root.querySelector('#donation-project');

      if (!projectSelect) {
        console.error('❌ Donation project select element not found');
        return;
      }

      // Clear existing options
      projectSelect.innerHTML = '';

      // Add all projects as options (using ID as value)
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id; // Store project ID instead of title
        option.textContent = project.title;
        projectSelect.appendChild(option);
      });

      console.log(`✅ Loaded ${projects.length} projects into donation form`);

    } catch (error) {
      console.error('❌ Failed to load projects for donation form:', error);
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

// Handle direct project links from header navigation
function handleDirectProjectLinks() {
  // Check if we're on project.html and have a project hash
  const isProjectPage = window.location.pathname.includes('project.html');
  const projectHash = window.location.hash.substring(1);

  if (isProjectPage && projectHash && projectHash !== 'main-project') {
    console.log('🔄 Direct project link detected:', projectHash);

    // Wait for projects to load, then show the specific project
    const checkProjectsLoaded = setInterval(() => {
      const targetProject = document.getElementById(projectHash);
      const projectList = document.getElementById('project-list');

      if (targetProject && projectList) {
        console.log('✅ Projects loaded, showing:', projectHash);
        clearInterval(checkProjectsLoaded);

        // Show the specific project
        projectList.classList.add('hidden');
        document.querySelectorAll('#project-details article').forEach(a => a.classList.add('hidden'));
        targetProject.classList.remove('hidden');
      }
    }, 100); // Check every 100ms

    // Stop checking after 5 seconds
    setTimeout(() => {
      clearInterval(checkProjectsLoaded);
    }, 5000);
  }
}

// Call this after DOM loads AND after projects load
window.addEventListener('DOMContentLoaded', () => {
  handleDirectProjectLinks();
});

// Also call when hash changes (in case user manually changes URL)
window.addEventListener('hashchange', handleDirectProjectLinks);

// Debug: Log all navigation events
console.log('=== NAVIGATION DEBUG ===');
console.log('Current URL:', window.location.href);
console.log('Pathname:', window.location.pathname);
console.log('Hash:', window.location.hash);
console.log('Project list element:', document.getElementById('project-list'));
console.log('Project details element:', document.getElementById('project-details'));

// Check if we're landing on a project page directly
if (window.location.pathname.includes('project.html') && window.location.hash) {
  console.log('🚨 LANDED ON PROJECT PAGE WITH HASH:', window.location.hash);
  console.log('Project elements exist:', {
    projectList: !!document.getElementById('project-list'),
    projectDetails: !!document.getElementById('project-details')
  });
}

// Load projects dynamically
async function loadProjects() {
  try {

    // Add a small delay to avoid conflict with dropdown load
    await new Promise(resolve => setTimeout(resolve, 1000));

    const projects = await pb.collection("Projects").getFullList({
      sort: "-created", // newest first
      filter: 'title != "Where needed most"', // Exclude default option
      requestKey: 'projects-page' // Add unique request key
    });

    const projectList = document.getElementById("project-list");
    const projectDetails = document.getElementById("project-details");

    projectList.innerHTML = "";
    projectDetails.innerHTML = "";

    projects.forEach(project => {
      const imageUrl = project.cover_image
        ? pb.files.getUrl(project, project.cover_image)
        : "https://via.placeholder.com/400x250";

      // --- Project card ---
      const card = document.createElement("div");
      card.className = "bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden";
      card.innerHTML = `
        <img src="${imageUrl}" alt="${project.title}" 
             class="w-full h-48 object-cover" />
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-800">${project.title}</h3>
          <p class="text-gray-600 text-sm mt-2">${project.description || ""}</p>
          <button class="mt-3 text-yashar-blue hover:underline font-medium"
                  data-slug="${project.slug}">
            Read More →
          </button>
        </div>
      `;
      projectList.appendChild(card);

      // --- Project detail (hidden article) ---
      const article = document.createElement("article");
      article.id = project.slug;
      article.className = "bg-white hidden rounded-xl shadow-sm border border-gray-200 p-8 mb-8 page-content";
      article.innerHTML = `
        <h2 class="text-3xl font-bold heading-font text-dark-gray mb-6">${project.title}</h2>
        <img src="${imageUrl}" alt="${project.title}" 
             class="w-full h-64 object-cover rounded-lg mb-6" />
        <div id="viewer-${project.id}" class="prose prose-lg max-w-none mb-6"></div>
        <button class="back-btn px-4 py-2 bg-yashar-blue text-white rounded-lg hover:bg-blue-700 transition">
          ← Back to Projects
        </button>
      `;
      projectDetails.appendChild(article);

      // --- Inject PocketBase HTML content directly ---
      const viewerEl = article.querySelector(`#viewer-${project.id}`);
      if (viewerEl) {
        viewerEl.innerHTML = project.content || "";
      }
    });

    // --- Add event listeners after rendering ---
    projectList.querySelectorAll("button[data-slug]").forEach(btn => {
      btn.addEventListener("click", () => {
        const slug = btn.dataset.slug;
        projectList.classList.add("hidden");
        document.querySelectorAll("#project-details article").forEach(a => a.classList.add("hidden"));
        const detail = document.getElementById(slug);
        if (detail) detail.classList.remove("hidden");
      });
    });

    projectDetails.addEventListener("click", (e) => {
      if (e.target.classList.contains("back-btn")) {
        window.location.hash = "main-project";
        projectDetails.querySelectorAll("article").forEach(a => a.classList.add("hidden"));
        projectList.classList.remove("hidden");

      }
    });

  } catch (err) {
    console.error("❌ Failed to load projects:", err);
  }
}


// Function to load featured projects for index.html
async function loadFeaturedProjects() {
  try {
    // Add a small delay to avoid conflict with dropdown load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use getList with page 1 and 4 items per page
    const result = await pb.collection("Projects").getList(1, 4, {
      sort: "-created",
      filter: 'hidden = false',
      filter: 'title = "SHE’ILAT KITBAG" || title = "The Injured Soilders Project" || title = "The Soldiers in Need Fund" || title = "Bereaved Family Fund"',
      requestKey: 'index-page' // Add unique request key
    });

    const featuredContainer = document.getElementById("featured-projects");

    if (!featuredContainer) {
      console.log("Featured projects container not found - probably not on index.html");
      return;
    }

    featuredContainer.innerHTML = "";

    // Use result.items instead of projects
    result.items.forEach(project => {
      const imageUrl = project.cover_image
        ? pb.files.getUrl(project, project.cover_image)
        : "https://via.placeholder.com/400x250";

      const card = document.createElement("div");
      card.className = "bg-light-gray p-6 rounded-lg shadow-lg border border-dark-gray hover:shadow-xl transition-shadow";
      card.innerHTML = `
        <img class="w-full h-48 object-cover rounded-lg mb-4"
             src="${imageUrl}"
             alt="${project.title}">
        <h3 class="font-oswald text-xl font-bold text-dark-gray mb-3">${project.title}</h3>
        <p class="text-gray-600 mb-4">${project.description || "Making a difference in the lives of our soldiers."}</p>
        <div class="flex justify-between items-center">
          <button class="bg-israel-blue text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors learn-more-btn"
                  data-slug="${project.slug}">
            Learn More
          </button>
        </div>
      `;
      featuredContainer.appendChild(card);
    });

    // Add click event listeners for "Learn More" buttons
    featuredContainer.querySelectorAll(".learn-more-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const slug = btn.dataset.slug;
        window.location.href = `project.html#${slug}`;
      });
    });

  } catch (err) {
    console.error("❌ Failed to load featured projects:", err);
    const featuredContainer = document.getElementById("featured-projects");
    if (featuredContainer) {
      featuredContainer.innerHTML = "<p class='text-center text-gray-600'>Unable to load projects at this time.</p>";
    }
  }
}

// SINGLE event listener to handle both pages
window.addEventListener("DOMContentLoaded", () => {
  const featuredContainer = document.getElementById("featured-projects");
  const projectListEl = document.getElementById("project-list");

  console.log("Checking containers:", { featuredContainer, projectListEl });

  if (featuredContainer) {
    // We're on index.html - load only 4 featured projects
    console.log("Loading featured projects for index.html");
    loadFeaturedProjects();
  } else if (projectListEl) {
    // We're on project.html - load all projects
    console.log("Loading all projects for project.html");
    loadProjects();
  } else {
    console.log("No project containers found on this page");
  }
});

// Function to load all projects for the dropdown menu
async function loadProjectsDropdown() {
  try {
    // Use getList instead of getFullList to avoid conflicts with other project loads
    const result = await pb.collection('Projects').getList(1, 50, { // Limit to 50 projects
      sort: '+created', // Newest first
      fields: 'id,title,slug', // Only get the fields we need for dropdown
      filter: 'title != "Where needed most"', // Exclude the default option
    });

    // FIXED: Get dropdown containers for desktop and mobile
    const desktopDropdown = document.getElementById('desktop-projects-dropdown');
    const mobileDropdown = document.getElementById('projects-dropdown');

    console.log('Dropdown elements found:', { desktopDropdown, mobileDropdown });

    if (!desktopDropdown) {
      console.error('Desktop dropdown container not found');
      return;
    }

    if (!mobileDropdown) {
      console.error('Mobile dropdown container not found');
      return;
    }

    // Clear existing dropdown items
    desktopDropdown.innerHTML = '';
    mobileDropdown.innerHTML = '';

    // Populate both dropdowns with project titles
    result.items.forEach(project => {
      // Create desktop dropdown item
      const desktopItem = document.createElement('li');
      desktopItem.innerHTML = `
        <a href="project.html#${project.slug}"
           class="na-link block px-4 py-2 text-gray-700 hover:bg-gray-100"
           data-file="project.html" data-target="${project.slug}">
           ${project.title}
        </a>
      `;
      desktopDropdown.appendChild(desktopItem);

      // Create mobile dropdown item
      const mobileItem = document.createElement('li');
      mobileItem.innerHTML = `
        <a href="project.html#${project.slug}" 
           class="na-link block hover:text-israel-blue" 
           data-file="project.html" data-target="${project.slug}">
           ${project.title}
        </a>
      `;
      mobileDropdown.appendChild(mobileItem);
    });

    console.log(`✅ Loaded ${result.items.length} projects into dropdown menu`);

  } catch (error) {
    console.error('❌ Failed to load projects for dropdown:', error);

    // Fallback to hardcoded items if API fails
    const fallbackProjects = [
      { title: 'Warm Corners', slug: 'warm-corner-project' },
      { title: 'Soldiers in Need', slug: 'Soldiers-in-need-fund-project' },
      { title: 'Injured Soldier Fund', slug: 'Injured-Soldier-Fund' },
      { title: 'Families Support', slug: 'Families-Support' }
    ];

    // FIXED: Use correct selectors in fallback too
    const desktopDropdown = document.getElementById('desktop-projects-dropdown');
    const mobileDropdown = document.getElementById('projects-dropdown');

    if (desktopDropdown && mobileDropdown) {
      fallbackProjects.forEach(project => {
        const desktopItem = document.createElement('li');
        desktopItem.innerHTML = `
          <a href="project.html#${project.slug}"
             class="na-link block px-4 py-2 text-gray-700 hover:bg-gray-100"
             data-file="project.html" data-target="${project.slug}">
             ${project.title}
          </a>
        `;
        desktopDropdown.appendChild(desktopItem);

        const mobileItem = document.createElement('li');
        mobileItem.innerHTML = `
          <a href="project.html#${project.slug}" 
             class="na-link block hover:text-israel-blue" 
             data-file="project.html" data-target="${project.slug}">
             ${project.title}
          </a>
        `;
        mobileDropdown.appendChild(mobileItem);
      });
    }
  }
}