const Router = require("koa-router");
const userControllers = require("../controllers/user");
const authControllers = require("../controllers/auth");

const { jwtAuth } = authControllers;

const {
  redeemOffer,
  redeemAndNotify,
  creditUser,
  requestCredit,
  generatePlug,
  basicPlugRedirect,
  getPluggerConfirmation,
  plugRedirect,
  getUser,
  getUsers,
  deleteUser,
  editUser
} = userControllers;

const router = new Router({ prefix: "/user" });

router.get("/basic-plug-redirect/:plugId", basicPlugRedirect);
router.post("/generate-plug/:id/:business", jwtAuth, generatePlug);
router.get("/plugger-conf/:plugId", getPluggerConfirmation);
router.post("/plug-redirect/:userId/:plugId", jwtAuth, plugRedirect);
router.post("/redeem-offer-notify/:userId/:busId/:offId", jwtAuth, redeemAndNotify);
router.post("/redeem-offer/:userId/:busId/:offId", jwtAuth, redeemOffer);
router.post("/credit-user/:id", jwtAuth, creditUser);
router.post("/request-credit", jwtAuth, requestCredit);
router.get("/", jwtAuth, getUsers);
router.get("/:id", jwtAuth, getUser);
router.delete("/:id", jwtAuth, deleteUser);

module.exports = router;
