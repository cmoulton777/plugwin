const Router = require("koa-router");
const authControllers = require("../controllers/auth");
const {ROLES} = require("../constants");

const {
  jwtAuth,
  login,
  googleLogin,
  facebookLogin,
  register,
  getNotifications,
  declineRequest,
  clearNotifications,
  removeNotification,
  verifyAccount,
  resendAccountVerification,
  forgotPassword,
  resetPassword,
  updateAccount,
  getAuthenticatedUser,
  notifyRewardSent
} = authControllers;

const router = new Router({prefix: "/auth"});

router.post("/register", register);
router.post("/resend-verification/:id", jwtAuth, resendAccountVerification);
router.post("/verify-account/:id/:verifyToken", jwtAuth, verifyAccount);
router.post("/login", login);
router.post("/oauth/google", googleLogin);
router.post("/oauth/facebook", facebookLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/update-account/:resetToken", updateAccount);
router.post("/reset-password/:resetToken", resetPassword);
router.post("/reward-sent/:userId", jwtAuth, notifyRewardSent);
router.post("/decline-credit", jwtAuth, declineRequest);
router.post("/clear-notifications/:userId", jwtAuth, clearNotifications);
router.post("/remove-notification/:userId/:id", jwtAuth, removeNotification);
router.get("/notifications", jwtAuth, getNotifications);
router.get("/profile", jwtAuth, getAuthenticatedUser);

module.exports = router;
