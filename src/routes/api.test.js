const assert = require("node:assert/strict");
const { test } = require("node:test");

const api = require("./api");
const adminController = require("../controllers/adminController");

test("does not expose a global order listing endpoint", () => {
  const exposesGlobalOrders = api.stack.some((layer) =>
    layer.route?.path === "/admin/orders" || layer.route?.path === "/orders"
  );
  assert.equal(exposesGlobalOrders, false);
});

test("protects complimentary reseller access with admin authentication", () => {
  const route = api.stack.find((layer) => layer.route?.path === "/admin/reseller-access")?.route;
  assert.ok(route);
  assert.equal(route.stack[0].handle, adminController.requireAdmin);
});