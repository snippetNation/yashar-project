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