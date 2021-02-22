const Router = require('koa-router');
const billingControllers = require('../controllers/billing');
const authControllers = require('../controllers/auth');

const {
  stripeWebhook,
  createSubscription,
  cancelSubscription,
  createCustomer,
  createCharge
} = billingControllers;

const {
  jwtAuth,
} = authControllers;

const router = new Router({ prefix: '/billing' });

router.post('/webhook', stripeWebhook);
router.post('/subscription', jwtAuth, createSubscription, createCustomer);
router.post('/cancel-subscription/:busId', jwtAuth, cancelSubscription);
router.post('/charge/:busId', jwtAuth, createCharge);

module.exports = router;
