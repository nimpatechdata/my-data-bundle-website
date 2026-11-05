const state = {
  catalog: null,
  network: "mtn",
  bundleId: null
};
const requestedNetwork = new URLSearchParams(window.location.search).get("network");
const requestedBundle = new URLSearchParams(window.location.search).get("bundle");

const networkBox = document.getElementById("network-choices");
const bundleBox = document.getElementById("bundle-choices");
const errorEl = document.getElementById("error");
const phoneInput = document.getElementById("phone");
const buyerNameInput = document.getElementById("buyer-name");

function selectedBundle() {
  if (!state.catalog) return null;
  return (state.catalog.bundles[state.network] || []).find(
    (item) => item.id === state.bundleId
  );
}

function renderSummary() {
  const bundle = selectedBundle();
  const network = state.catalog?.networks.find((item) => item.id === state.network);
  const summaryNetwork = document.getElementById("sum-network");
  const summaryPhone = phoneInput?.value?.trim() || "";
  summaryNetwork.textContent = network ? network.name : "—";
  summaryNetwork.dataset.network = network?.id || "";
  document.getElementById("sum-bundle").textContent = bundle ? bundle.size : "—";
  document.getElementById("sum-validity").textContent = bundle ? bundle.validity : "—";
  document.getElementById("sum-phone").textContent = summaryPhone || "—";
  document.getElementById("sum-total").textContent = bundle ? `GHS ${bundle.priceGhs}` : "GHS 0";
  const label = document.getElementById("selected-bundle-label");
  if (label) {
    label.textContent = bundle
      ? `${network?.name || "Network"} · ${bundle.size} · GHS ${bundle.priceGhs}`
      : "Choose a bundle above";
  }
}

function renderNetworks() {
  if (!networkBox) return;
  networkBox.innerHTML = "";
  state.catalog.networks.forEach((network) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `home-network-tab network-${network.id} ${state.network === network.id ? "is-active" : ""}`;
    button.dataset.network = network.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(state.network === network.id));
    button.textContent = network.name;
    button.addEventListener("click", () => {
      state.network = network.id;
      const available = state.catalog.bundles[network.id] || [];
      state.bundleId = available[0]?.id || null;
      renderNetworks();
      renderBundles();
      renderSummary();
    });
    networkBox.appendChild(button);
  });
}

function renderBundles() {
  if (!bundleBox) return;
  const network = state.catalog.networks.find((item) => item.id === state.network);
  const bundles = state.catalog.bundles[state.network] || [];
  const picker = document.getElementById("checkout-form");
  const recipientDetails = document.getElementById("recipient-details");
  bundleBox.replaceChildren();
  bundleBox.dataset.network = state.network;
  picker.dataset.network = state.network;
  bundles.forEach((bundle) => {
    const card = document.createElement("button");
    card.type = "button";
    const selected = state.bundleId === bundle.id;
    card.className = `mtn-pick network-${state.network}${selected ? " is-selected" : ""}`;
    card.setAttribute("aria-pressed", String(selected));
    card.setAttribute("aria-label", `${selected ? "Selected: " : "Choose "}${network.name} ${bundle.size} for GHS ${Number(bundle.priceGhs).toFixed(2)}`);
    card.addEventListener("click", () => {
      state.bundleId = bundle.id;
      renderBundles();
      renderSummary();
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
    cta.textContent = selected ? "Selected bundle ✓" : "Choose this bundle";
    card.append(label, size, price, cta);
    bundleBox.appendChild(card);
  });
  recipientDetails.hidden = !state.bundleId;
}

async function loadCatalog() {
  const response = await fetch("/api/catalog");
  state.catalog = await response.json();
  if (requestedNetwork && state.catalog.bundles[requestedNetwork]) {
    state.network = requestedNetwork;
  }
  const availableBundles = state.catalog.bundles[state.network] || [];
  state.bundleId = availableBundles.some((bundle) => bundle.id === requestedBundle)
    ? requestedBundle
    : availableBundles[0]?.id;
  renderNetworks();
  renderBundles();
  renderSummary();
}

phoneInput.addEventListener("input", () => {
  const phone = phoneInput.value.replace(/\D/g, "");
  if (phone !== phoneInput.value) {
    phoneInput.value = phone;
  }
  renderSummary();
});

document.getElementById("checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  const payBtn = document.getElementById("pay-btn");
  const phone = phoneInput.value.trim();

  if (!/^(0|233)[0-9]{9,10}$/.test(phone)) {
    errorEl.textContent = "Please enter a valid Ghana mobile number. Example: 0241234567";
    phoneInput.focus();
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = "Starting payment...";

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: state.network,
        bundleId: state.bundleId,
        phone,
        buyerName: buyerNameInput.value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Checkout failed");
    }
    window.location.href = data.payment.authorizationUrl;
  } catch (error) {
    errorEl.textContent = error.message;
    payBtn.disabled = false;
    payBtn.textContent = "Continue to payment";
  }
});

loadCatalog().catch(() => {
  errorEl.textContent = "Could not load bundles. Start the server with npm start.";
});
