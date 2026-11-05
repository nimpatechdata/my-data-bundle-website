const assert = require("node:assert/strict");
const { after, test } = require("node:test");

const supabase = require("../services/supabaseClient");
const orders = require("../store/orders");
const originalGetAdminClient = supabase.getAdminClient;
const originalListOrders = orders.listOrders;
const { enableAdminReseller, list } = require("./adminController");

let profileRow;
let authUsers;
let createdUser;
let updatedPassword;
let profileSchemaError;

function makeAdminClient() {
  return {
    auth: {
      admin: {
        async listUsers() {
          return { data: { users: authUsers }, error: null };
        },
        async createUser(values) {
          createdUser = { id: "admin-reseller-id", ...values };
          authUsers.push(createdUser);
          return { data: { user: createdUser }, error: null };
        },
        async updateUserById(userId, values) {
          updatedPassword = values.password;
          const user = authUsers.find((item) => item.id === userId);
          return { data: { user: { ...user, ...values } }, error: null };
        }
      }
    },
    from(table) {
      assert.equal(table, "agent_profiles");
      let action = "select";
      let values;
      const builder = {
        select() { action = "select"; return builder; },
        insert(nextValues) { action = "insert"; values = nextValues; return builder; },
        update(nextValues) { action = "update"; values = nextValues; return builder; },
        eq() { return builder; },
        limit() { return builder; },
        async maybeSingle() { return { data: profileRow, error: null }; },
        then(resolve, reject) {
          if (action === "insert" || action === "update") profileRow = { ...profileRow, ...values };
          return Promise.resolve({ error: profileSchemaError }).then(resolve, reject);
        }
      };
      return builder;
    }
  };
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

after(() => {
  supabase.getAdminClient = originalGetAdminClient;
  orders.listOrders = originalListOrders;
});

test("admin activity includes the buyer name captured during checkout", async () => {
  orders.listOrders = async () => [{
    id: "order-1",
    buyerName: "Ama Mensah",
    email: "ama@example.com",
    phone: "0241234567",
    network: "mtn",
    size: "1GB",
    priceGhs: 5,
    status: "awaiting_payment"
  }];
  const res = response();

  await list({}, res);

  assert.equal(res.body.orders[0].customerName, "Ama Mensah");
});

test("admin can provision reseller access with an audited complimentary grant", async () => {
  profileRow = null;
  authUsers = [];
  createdUser = null;
  updatedPassword = null;
  profileSchemaError = null;
  supabase.getAdminClient = makeAdminClient;
  const res = response();

  await enableAdminReseller({
    admin: { email: "owner@example.com" },
    body: { fullName: "Store Owner", phone: "0241234567", password: "reseller-pass-123" }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.email, "owner@example.com");
  assert.equal(res.body.loginUrl, "/agents.html");
  assert.equal(createdUser.email, "owner@example.com");
  assert.equal(createdUser.email_confirm, true);
  assert.equal(profileRow.membership_status, "active");
  assert.equal(profileRow.membership_source, "admin_grant");
  assert.equal(profileRow.membership_granted_by, "owner@example.com");
  assert.ok(profileRow.membership_granted_at);
});

test("admin reseller action does not reactivate suspended accounts", async () => {
  profileRow = { membership_status: "suspended" };
  authUsers = [{ id: "existing-user", email: "owner@example.com", user_metadata: {} }];
  updatedPassword = null;
  profileSchemaError = null;
  supabase.getAdminClient = makeAdminClient;
  const res = response();

  await enableAdminReseller({
    admin: { email: "owner@example.com" },
    body: { fullName: "Store Owner", phone: "0241234567", password: "reseller-pass-123" }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(updatedPassword, null);
  assert.equal(res.body.error, "This reseller account is suspended. Contact support.");
});

test("admin reseller action validates submitted details", async () => {
  supabase.getAdminClient = () => {
    throw new Error("Database must not be accessed for invalid input");
  };
  const res = response();

  await enableAdminReseller({
    admin: { email: "owner@example.com" },
    body: { fullName: "Store Owner", phone: "123", password: "short" }
  }, res);

  assert.equal(res.statusCode, 400);
});

test("admin reseller action checks the grant schema before creating an auth user", async () => {
  authUsers = [];
  createdUser = null;
  profileSchemaError = new Error("membership_source column is missing");
  supabase.getAdminClient = makeAdminClient;
  const res = response();

  await enableAdminReseller({
    admin: { email: "owner@example.com" },
    body: { fullName: "Store Owner", phone: "0241234567", password: "reseller-pass-123" }
  }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(createdUser, null);
  assert.match(res.body.error, /latest Supabase schema/);
});