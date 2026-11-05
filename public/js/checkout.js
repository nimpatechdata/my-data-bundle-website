const state = {
  catalog: null,
  network: "mtn",
  bundleId: null
};
const requestedNetwork = new URLSearchParams(window.location.search).get("network");
const requestedBundle = new URLSearchParams(window.location.search).get("bundle");

const networkBox = document.getElementById("network-choices");
const bundleBox = document.getElementById("bundle-choices");
const picker = document.getElementById("checkout-bundle-picker");
const dialog = document.getElementById("checkout-purchase-dialog");
const form = document.getElementById("checkout-buy-form");
const nameInput = document.getElementById("buyer-name");
const phoneInput = document.getElementById("phone");
const summary = document.getElementById("checkout-purchase-summary");
const errorEl = document.getElementById("error");
const payButton = document.getElementById("pay-btn");

function renderNetworks() {
  networkBox.replaceChildren();
  state.catalog.networks.forEach((network) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `home-network-tab network-${network.id}${state.network === network.id ? " is-active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(state.network === network.id));
    button.textContent = network.name;
    button.addEventListener("click", () => {
      state.network = network.id;
      const availableBundles = state.catalog.bundles[state.network] || [];
      state.bundleId = availableBundles[0]?.id || null;
      renderNetworks();
      renderBundles();
    });
    networkBox.appendChild(button);
  });
}

function renderBundles() {
  const network = state.catalog.networks.find((item) => item.id === state.network);
  const bundles = state.catalog.bundles[state.network] || [];
  bundleBox.replaceChildren();
  bundleBox.dataset.network = state.network;
  picker.dataset.network = state.network;

  bundles.forEach((bundle) => {
    const card = document.createElement("button");
    card.type = "button";
    const isSelected = state.bundleId === bundle.id;
    card.className = `mtn-pick network-${state.network}${isSelected ? " is-selected" : ""}`;
    card.setAttribute("aria-pressed", String(isSelected));
    card.setAttribute("aria-label", `Buy ${network.name} ${bundle.size} for GHS ${Number(bundle.priceGhs).toFixed(2)}`);
    card.addEventListener("click", () => {
      state.bundleId = bundle.id;
      renderBundles();
      summary.textContent = `${network.name} · ${bundle.size} · GHS ${Number(bundle.priceGhs).toFixed(2)}`;
      errorEl.textContent = "";
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
    bundleBox.appendChild(card);
  });

  if (!bundles.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "orders-message";
    emptyMessage.textContent = "No bundles are available for this network right now.";
    bundleBox.appendChild(emptyMessage);
  }
}

async function loadCatalog() {
  const response = await fetch("/api/catalog", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Could not load bundles. Please refresh and try again.");
  state.catalog = await response.json();
  if (requestedNetwork && state.catalog.bundles[requestedNetwork]) state.network = requestedNetwork;
  const availableBundles = state.catalog.bundles[state.network] || [];
  state.bundleId = availableBundles.some((bundle) => bundle.id === requestedBundle)
    ? requestedBundle
    : availableBundles[0]?.id || null;
  renderNetworks();
  renderBundles();
}

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "");
});

document.getElementById("checkout-dialog-close").addEventListener("click", () => dialog.close());
document.getElementById("checkout-dialog-cancel").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  payButton.disabled = false;
  payButton.textContent = "Continue to secure payment";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.bundleId) return;
  errorEl.textContent = "";
  payButton.disabled = true;
  payButton.textContent = "Starting secure payment…";

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        network: state.network,
        bundleId: state.bundleId,
        buyerName: nameInput.value.trim(),
        phone: phoneInput.value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Checkout failed. Please try again.");
    if (!data.payment?.authorizationUrl) throw new Error("Secure payment is unavailable right now. Please try again.");
    window.location.assign(data.payment.authorizationUrl);
  } catch (error) {
    errorEl.textContent = error.message;
    payButton.disabled = false;
    payButton.textContent = "Continue to secure payment";
  }
});

loadCatalog().catch((error) => {
  bundleBox.replaceChildren();
  const message = document.createElement("p");
  message.className = "orders-message";
  message.textContent = error.message;
  bundleBox.appendChild(message);
});