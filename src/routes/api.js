const express = require("express");
const checkoutController = require("../controllers/checkoutController");
const agentController = require("../controllers/agentController");
const webhookController = require("../controllers/webhookController");
const adminController = require("../controllers/adminController");
const customerController = require("../controllers/customerController");
const trackingController = require("../controllers/trackingController");
const siteUpdatesController = require("../controllers/siteUpdatesController");
const analyticsController = require("../controllers/analyticsController");
const blogController = require("../controllers/blogController");

const router = express.Router();

function safeRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500);
      if (res.headersSent) return;
      console.error("API route failed:", error?.message || error);
      res.status(statusCode >= 500 ? 503 : statusCode).json({
        error: error?.message || "Request failed."
      });
    }
  };
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nimpatech-data-bundles" });
});

router.get("/catalog", safeRoute(async (_req, res) => {
  res.json(await checkoutController.catalog());
}));
router.get("/site-settings", safeRoute(adminController.siteSettings));
router.get("/site-updates", safeRoute(siteUpdatesController.getSiteUpdates));
router.post("/analytics/visit", safeRoute(analyticsController.recordVisit));
router.get("/blog", safeRoute(blogController.listPublished));

router.post("/checkout", safeRoute(checkoutController.createCheckout));
router.post("/orders/track", safeRoute(checkoutController.trackOrders));
router.get("/orders/:id", safeRoute(checkoutController.getOrder));
router.post("/payments/confirm", safeRoute(checkoutController.confirmPayment));

router.post("/agents/enroll", safeRoute(agentController.enroll));
router.get("/agents/status", safeRoute(agentController.getStatus));
router.post("/agents/membership/confirm", safeRoute(agentController.confirmMembership));
router.post("/agents/login", safeRoute(agentController.login));
router.post("/agents/membership/retry", safeRoute(agentController.retryMembership));
router.get("/agents/catalog", safeRoute(agentController.getCatalog));
router.get("/agents/dashboard", safeRoute(agentController.getDashboard));
router.put("/agents/prices", safeRoute(agentController.savePrice));
router.post("/agents/orders", safeRoute(agentController.createOrder));
router.post("/agents/orders/confirm", safeRoute(agentController.confirmOrder));

router.post("/customers/signup", safeRoute(customerController.signup));
router.post("/customers/login", safeRoute(customerController.login));
router.get("/customers/me", safeRoute(customerController.me));
router.get("/customers/orders", safeRoute(customerController.listOrders));

router.post("/webhooks/payment", safeRoute(webhookController.handlePaymentWebhook));
router.post("/webhooks/vtu", safeRoute(webhookController.handleVtuWebhook));

router.post("/admin/login", safeRoute(adminController.login));
router.get("/admin/session", adminController.requireAdmin, safeRoute(adminController.session));
router.post("/admin/forgot-password", safeRoute(adminController.forgotPassword));
router.post("/admin/reset-password", safeRoute(adminController.resetPassword));
router.post("/admin/logout", safeRoute(adminController.logout));
router.get("/admin/activity", adminController.requireAdmin, safeRoute(adminController.list));
router.get("/admin/tracking", adminController.requireAdmin, safeRoute(trackingController.getTracking));
router.get("/admin/prices", adminController.requireAdmin, safeRoute(adminController.prices));
router.put("/admin/prices", adminController.requireAdmin, safeRoute(adminController.updatePrice));
router.put("/admin/password", adminController.requireAdmin, safeRoute(adminController.changePassword));
router.get("/admin/settings", adminController.requireAdmin, safeRoute(adminController.siteSettings));
router.put("/admin/settings", adminController.requireAdmin, safeRoute(adminController.updateSiteSettings));
router.post("/admin/reseller-access", adminController.requireAdmin, safeRoute(adminController.enableAdminReseller));
router.get("/admin/agent-preview", adminController.requireAdmin, safeRoute(adminController.agentPreview));
router.get("/admin/analytics", adminController.requireAdmin, safeRoute(analyticsController.getAnalytics));
router.get("/admin/blog", adminController.requireAdmin, safeRoute(blogController.listAdmin));
router.post("/admin/blog", adminController.requireAdmin, safeRoute(blogController.create));
router.put("/admin/blog/:id", adminController.requireAdmin, safeRoute(blogController.update));
router.delete("/admin/blog/:id", adminController.requireAdmin, safeRoute(blogController.remove));

module.exports = router;
