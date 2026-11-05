(() => {
  const grid = document.getElementById("home-bundle-grid");
  const tabs = document.getElementById("home-network-tabs");
  const dialog = document.getElementById("home-purchase-dialog");
  const form = document.getElementById("home-purchase-form");
  if (!grid || !tabs || !dialog || !form) return;

  const nameInput = document.getElementById("home-buyer-name");
  const phoneInput = document.getElementById("home-buyer-phone");
  const orderSummary = document.getElementById("home-purchase-summary");
  const errorMessage = document.getElementById("home-purchase-error");
  const submitButton = document.getElementById("home-purchase-submit");

  let catalog;
  let selectedNetwork = "mtn";
  let selectedBundle = null;

  function renderTabs() {
    tabs.replaceChildren();
    catalog.networks.forEach((network) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `home-network-tab network-${network.id}${selectedNetwork === network.id ? " is-active" : ""}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(selectedNetwork === network.id));
      button.textContent = network.name;
      button.addEventListener("click", () => {
        selectedNetwork = network.id;
        renderTabs();
        renderBundles();
      });
      tabs.appendChild(button);
    });
  }

  function renderBundles() {
    const network = catalog.networks.find((item) => item.id === selectedNetwork);
    const bundles = catalog.bundles[selectedNetwork] || [];
    grid.replaceChildren();
    grid.dataset.network = selectedNetwork;
    bundles.forEach((bundle) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `mtn-pick network-${selectedNetwork}`;
      card.setAttribute("aria-label", `Buy ${network.name} ${bundle.size} for GHS ${Number(bundle.priceGhs).toFixed(2)}`);
      card.addEventListener("click", () => {
        selectedBundle = { ...bundle, network: selectedNetwork, networkName: network.name };
        orderSummary.textContent = `${network.name} · ${bundle.size} · GHS ${Number(bundle.priceGhs).toFixed(2)}`;
        errorMessage.textContent = "";
        form.reset();
        dialog.showModal();
        nameInput.focus();
      });

      const label = document.createElement("span");
      label.className = "mtn-pick__label";
      label.textContent = network.name;
      const size = document.createElement("strong");
      size.textContent = bundle.size;
      const price = document.createElement("span");
      price.className = "mtn-pick__price";
      price.textContent = `GHS ${Number(bundle.priceGhs).toFixed(2)}`;
      const cta = document.createElement("span");
      cta.className = "mtn-pick__cta";
      cta.textContent = "Buy this bundle";
      card.append(label, size, price, cta);
      grid.appendChild(card);
    });
    if (!bundles.length) grid.innerHTML = '<p class="orders-message">No bundles are available for this network right now.</p>';
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedBundle) return;
    errorMessage.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Starting secure payment…";
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          network: selectedBundle.network,
          bundleId: selectedBundle.id,
          buyerName: nameInput.value.trim(),
          phone: phoneInput.value.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      const paymentUrl = data.payment?.authorizationUrl;
      if (!paymentUrl) throw new Error("Secure payment is unavailable right now. Please try again.");
      window.location.assign(paymentUrl);
    } catch (error) {
      errorMessage.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = "Continue to secure payment";
    }
  });

  dialog.addEventListener("close", () => {
    submitButton.disabled = false;
    submitButton.textContent = "Continue to secure payment";
  });

  fetch("/api/catalog", { headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error("Bundle prices are temporarily unavailable.");
      return response.json();
    })
    .then((data) => {
      catalog = data;
      if (!catalog.networks.some((network) => network.id === selectedNetwork)) selectedNetwork = catalog.networks[0]?.id;
      renderTabs();
      renderBundles();
    })
    .catch((error) => {
      grid.replaceChildren();
      const message = document.createElement("p");
      message.className = "orders-message";
      message.textContent = error.message;
      grid.appendChild(message);
    });
})();
