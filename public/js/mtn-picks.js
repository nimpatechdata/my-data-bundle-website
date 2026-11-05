(() => {
  const grid = document.getElementById("home-bundle-grid");
  const tabs = document.getElementById("home-network-tabs");
  if (!grid || !tabs) return;

  let catalog;
  let selectedNetwork = "mtn";

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
      const card = document.createElement("a");
      card.className = `mtn-pick network-${selectedNetwork}`;
      card.href = `/checkout.html?${new URLSearchParams({ network: selectedNetwork, bundle: bundle.id })}`;
      card.setAttribute("aria-label", `Buy ${network.name} ${bundle.size} for GHS ${Number(bundle.priceGhs).toFixed(2)}`);

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
