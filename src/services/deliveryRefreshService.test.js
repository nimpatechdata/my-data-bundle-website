const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");

const deliveryRefreshService = require("./deliveryRefreshService");
const orders = require("../store/orders");
const vtuService = require("./vtuService");

const originalSetInterval = global.setInterval;
const originalVTUProvider = process.env.VTU_PROVIDER;
const originalDatamartStatusUrl = process.env.DATAMART_STATUS_URL;
const originalListOrders = orders.listOrders;
const originalIsConfigured = vtuService.isConfigured;
const originalGetDeliveryStatus = vtuService.getDeliveryStatus;

afterEach(() => {
  global.setInterval = originalSetInterval;
  if (originalVTUProvider === undefined) delete process.env.VTU_PROVIDER;
  else process.env.VTU_PROVIDER = originalVTUProvider;
  if (originalDatamartStatusUrl === undefined) delete process.env.DATAMART_STATUS_URL;
  else process.env.DATAMART_STATUS_URL = originalDatamartStatusUrl;
  orders.listOrders = originalListOrders;
  vtuService.isConfigured = originalIsConfigured;
  vtuService.getDeliveryStatus = originalGetDeliveryStatus;
});

test("startDeliveryRefresh uses a synchronous interval callback that cannot reject unhandled async work", async () => {
  process.env.VTU_PROVIDER = "datamart";
  process.env.DATAMART_STATUS_URL = "https://example.test/status/{reference}";

  const scheduled = [];
  global.setInterval = (fn) => {
    scheduled.push(fn);
    return { unref() {} };
  };

  orders.listOrders = async () => [{
    id: "order-1",
    status: "paid_awaiting_delivery",
    delivery: { providerReference: "ref-1" }
  }];
  vtuService.isConfigured = () => true;
  vtuService.getDeliveryStatus = async () => {
    throw new Error("provider unreachable");
  };

  const timer = deliveryRefreshService.startDeliveryRefresh();
  assert.ok(timer);
  assert.equal(scheduled.length > 0, true);
  assert.equal(typeof scheduled[0], "function");
  assert.equal(scheduled[0](), undefined);

  await Promise.resolve();
});
