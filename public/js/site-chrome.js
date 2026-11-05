(function () {
  try {
    const key = "nimpatech-visitor-id";
    let visitorId = localStorage.getItem(key);
    if (!visitorId) { visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; localStorage.setItem(key, visitorId); }
    fetch("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, path: window.location.pathname }) }).catch(() => {});
  } catch (_) {}
  function goBack() {
    const sameSiteReferrer = document.referrer.startsWith(window.location.origin);
    if (sameSiteReferrer && window.history.length > 1) window.history.back();
    else window.location.assign("/");
  }

  const menuToggle = document.getElementById("menu-toggle");
  const headerActions = menuToggle?.closest(".header-actions");
  if (menuToggle && window.location.pathname === "/") {
    menuToggle.textContent = "More";
    menuToggle.setAttribute("aria-label", "Show more site options");
  }
  if (!menuToggle || !headerActions) {
    const backButton = document.createElement("button");
    backButton.className = "site-back-button";
    backButton.type = "button";
    backButton.setAttribute("aria-label", "Go back to the previous page");
    backButton.textContent = "← Back";
    backButton.addEventListener("click", goBack);
    document.body.appendChild(backButton);
  }

  const menuBackButton = document.getElementById("menu-back-button");
  const dashboardNav = document.getElementById("dashboard-nav");
  if (menuBackButton) {
    if (dashboardNav) dashboardNav.prepend(menuBackButton);
    menuBackButton.addEventListener("click", goBack);
  }
  if (dashboardNav) {
    dashboardNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (link.hash === "#homepage-more") document.getElementById("homepage-more")?.setAttribute("open", "");
        dashboardNav.classList.remove("is-open");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const welcomeTitle = document.getElementById("welcome-title");
  const customerAccountLink = document.getElementById("customer-account-link");
  const customerSessionKey = "nimpatech-customer-session";
  const customerSession = (() => {
    try { return JSON.parse(localStorage.getItem(customerSessionKey) || "null"); } catch { return null; }
  })();

  function setGreeting(name) {
    if (!welcomeTitle) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    welcomeTitle.innerHTML = name ? `${greeting}, ${name}.<br />welcome back.` : `${greeting},<br />welcome back.`;
  }

  setGreeting(customerSession?.user?.name || "");
  if (customerAccountLink && customerSession?.user?.name) {
    customerAccountLink.textContent = `Hi, ${customerSession.user.name.split(" ")[0]}`;
    customerAccountLink.href = "/account.html";
  }

  if (menuToggle && dashboardNav) {
    menuToggle.addEventListener("click", () => {
      const open = dashboardNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      if (window.location.pathname === "/") menuToggle.textContent = open ? "Close" : "More";
    });
  }

  const homepageMore = document.getElementById("homepage-more");
  homepageMore?.addEventListener("toggle", () => {
    const summary = homepageMore.querySelector("summary");
    if (summary) summary.textContent = homepageMore.open ? "Less" : "More";
  });

  const year = new Date().getFullYear();
  const existingFooter = document.querySelector("footer");
  const footer = existingFooter || document.createElement("footer");
  footer.classList.add("site-footer");
  footer.innerHTML = `
    <nav class="site-footer__links" aria-label="Helpful links">
      <a class="site-footer__channel" href="https://whatsapp.com/channel/0029VbDe7YwIHphPAs75Yk0y" target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>
      <a class="site-footer__whatsapp" href="https://wa.me/233533323096" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href="#support-widget" data-open-support>Contact</a>
      <a href="/#live-updates">Live Updates</a>
      <a href="/agents.html">Become a Reseller</a>
      <a href="/agents.html">Reseller Registration</a>
      <a href="/agent-dashboard.html">Reseller Login</a>
      <a href="/checkout.html">Buy Data</a>
      <a href="/track.html">Track Purchase</a>
    </nav>
    <span>© ${year} Nimpatech Data. All rights reserved.</span>`;
  if (!existingFooter) document.body.appendChild(footer);

  fetch("/api/site-settings").then((response) => response.ok ? response.json() : null).then((settings) => {
    if (!settings?.whatsappNumber) return;
    const number = settings.whatsappNumber.replace(/\D/g, "");
    const whatsapp = footer.querySelector(".site-footer__whatsapp");
    if (whatsapp) whatsapp.href = `https://wa.me/${number}`;
  }).catch(() => {});
})();
