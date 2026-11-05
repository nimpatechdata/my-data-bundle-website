(() => {
  const form = document.getElementById("tracker-form");
  const lookupInput = document.getElementById("tracker-lookup");
  const submitButton = document.getElementById("tracker-submit");
  const message = document.getElementById("tracker-message");
  const results = document.getElementById("tracker-results");
  let trackedOrders = [];

  function elapsedSeconds(order) {
    const start = new Date(order.delivery?.startedAt || order.createdAt).getTime();
    const end = order.delivery?.deliveredAt ? new Date(order.delivery.deliveredAt).getTime() : Date.now();
    return Number.isFinite(start) ? Math.max(0, Math.floor((end - start) / 1000)) : null;
  }

  function pace(order) {
    if (!["delivered", "paid_awaiting_delivery", "delivery_review", "delivery_failed", "processing"].includes(order.status)) {
      return { label: "Waiting for payment", className: "waiting" };
    }
    if (order.status === "delivery_failed") return { label: "Delivery needs support", className: "slow" };
    const seconds = elapsedSeconds(order) ?? 0;
    if (seconds <= 120) return { label: "Very fast 🔥", className: "very-fast" };
    if (seconds <= 300) return { label: "Fast 🔥", className: "fast" };
    if (seconds <= 600) return { label: "Slow", className: "slow" };
    return { label: "Very slow", className: "very-slow" };
  }

  function statusLabel(order) {
    if (order.status === "delivered" || order.delivery?.delivered) return "Data delivered";
    if (order.status === "delivery_failed" || order.delivery?.failed) return "Delivery failed";
    if (["paid_awaiting_delivery", "processing", "delivery_review"].includes(order.status)) return "Data is being delivered";
    if (["awaiting_payment", "demo_pending", "payment_failed"].includes(order.status)) return order.status === "payment_failed" ? "Payment failed" : "Awaiting payment";
    return order.status.replaceAll("_", " ");
  }

  function elapsedLabel(order) {
    const seconds = elapsedSeconds(order);
    if (seconds === null || pace(order).className === "waiting") return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    const formatted = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainder).padStart(2, "0")}s`;
    return order.delivery?.delivered ? `Delivered in ${formatted}` : `Elapsed ${formatted}`;
  }

  function render() {
    results.replaceChildren();
    trackedOrders.forEach((order) => {
      const card = document.createElement("article");
      card.className = "purchase-card";
      const heading = document.createElement("div");
      heading.className = "purchase-card__heading";
      const titleBlock = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = `${order.networkName || "Data"} · ${order.size || "Bundle"}`;
      const reference = document.createElement("code");
      reference.className = "purchase-card__reference";
      reference.textContent = order.id;
      titleBlock.append(title, reference);
      const badge = document.createElement("span");
      badge.className = `purchase-status ${order.status === "delivered" ? "is-delivered" : ["delivery_failed", "payment_failed"].includes(order.status) ? "is-failed" : "is-pending"}`;
      badge.textContent = statusLabel(order);
      heading.append(titleBlock, badge);

      const details = document.createElement("div");
      details.className = "purchase-card__details";
      [["Purchase time", new Date(order.createdAt).toLocaleString("en-GH")], ["Bundle price", `GHS ${Number(order.priceGhs || 0).toFixed(2)}`], ["Delivery time", elapsedLabel(order)]].forEach(([label, value]) => {
        const item = document.createElement("div");
        const caption = document.createElement("span");
        caption.textContent = label;
        const text = document.createElement("strong");
        text.textContent = value;
        if (label === "Delivery time") text.dataset.elapsedFor = order.id;
        item.append(caption, text);
        details.appendChild(item);
      });
      const speed = document.createElement("p");
      const deliveryPace = pace(order);
      speed.className = `purchase-speed purchase-speed--${deliveryPace.className}`;
      speed.dataset.paceFor = order.id;
      speed.textContent = deliveryPace.label;
      const elapsed = document.createElement("span");
      elapsed.className = "purchase-speed__elapsed";
      elapsed.dataset.paceElapsedFor = order.id;
      const seconds = elapsedSeconds(order);
      if (seconds !== null && deliveryPace.className !== "waiting") elapsed.textContent = `· ${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      speed.appendChild(elapsed);
      card.append(heading, details, speed);
      results.appendChild(card);
    });
  }

  function refreshClocks() {
    trackedOrders.forEach((order) => {
      const timeTarget = results.querySelector(`[data-elapsed-for="${CSS.escape(order.id)}"]`);
      const paceTarget = results.querySelector(`[data-pace-for="${CSS.escape(order.id)}"]`);
      const paceElapsed = results.querySelector(`[data-pace-elapsed-for="${CSS.escape(order.id)}"]`);
      if (timeTarget) timeTarget.textContent = elapsedLabel(order);
      if (!paceTarget) return;
      const current = pace(order);
      paceTarget.className = `purchase-speed purchase-speed--${current.className}`;
      paceTarget.firstChild.textContent = current.label;
      const seconds = elapsedSeconds(order);
      if (paceElapsed && seconds !== null && current.className !== "waiting") paceElapsed.textContent = `· ${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    });
  }

  async function lookupOrders(value, showLoading = true) {
    if (showLoading) {
      message.className = "tracker-message";
      message.textContent = "Looking up your purchase…";
    }
    const response = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ lookup: value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not find that purchase.");
    trackedOrders = data.orders || [];
    render();
    message.textContent = trackedOrders.length > 1 ? `${trackedOrders.length} recent purchases found. Updates refresh automatically.` : "Purchase found. Updates refresh automatically.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lookup = lookupInput.value.trim();
    if (!lookup) return;
    submitButton.disabled = true;
    submitButton.textContent = "Searching…";
    try {
      await lookupOrders(lookup);
      window.history.replaceState(null, "", "/track.html");
    } catch (error) {
      trackedOrders = [];
      results.replaceChildren();
      message.className = "tracker-message is-error";
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Find purchase";
    }
  });

  const initialLookup = new URLSearchParams(window.location.search).get("lookup") || new URLSearchParams(window.location.search).get("purchaseId");
  if (initialLookup) {
    lookupInput.value = initialLookup;
    lookupOrders(initialLookup).catch((error) => {
      message.className = "tracker-message is-error";
      message.textContent = error.message;
    });
  }
  window.setInterval(async () => {
    refreshClocks();
    if (!trackedOrders.length) return;
    try { await lookupOrders(lookupInput.value.trim(), false); } catch { /* Keep the last known status visible during a temporary outage. */ }
  }, 15_000);
  window.setInterval(refreshClocks, 1000);
})();
