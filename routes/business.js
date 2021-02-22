const Router = require("koa-router");
const userControllers = require("../controllers/user");
const businessControllers = require("../controllers/business");
const authControllers = require("../controllers/auth");
const ROLES = require("../constants").ROLES;

const { jwtAuth } = authControllers;

const {
  addBusiness,
  addPurchaseType,
  updatePurchaseType,
  deletePurchaseType,
  addOffer,
  getMoreBusinesses,
  getAllVerifiedBusinesses,
  getSubscribedByBusiness,
  getSubscribedBusinesses,
  getSubscribedFromBusinessesByUser,
  getInitialBusinesses,
  getBusinessById,
  getBusinessByName,
  getBusinesses,
  getBusinessesByUser,
  prepareBusinessDelete,
  deleteBusiness,
  adminDeleteBusiness,
  autoVerifyBusiness,
  autoUnverifyBusiness,
  updateBusiness,
  resendVerification,
  verifyBusiness,
  editOffer,
  deleteOffer
} = businessControllers;

const router = new Router({ prefix: "/business" });

/* Business CRUD */
router.post("/:id", jwtAuth, addBusiness);
router.post("/edit/:id/:user", jwtAuth, updateBusiness);
router.post("/resend-verification/:id", jwtAuth, resendVerification);
router.post("/verify/:userId/:verifyToken", jwtAuth, verifyBusiness);
router.post("/delete/:id", jwtAuth, prepareBusinessDelete);
router.get("/", jwtAuth, getBusinesses);
router.get("/my-subscribers/:id", jwtAuth, getSubscribedFromBusinessesByUser);
router.get("/subscribed/:id", jwtAuth, getSubscribedBusinesses);
router.get("/subscribers/:id", jwtAuth, getSubscribedByBusiness);
router.get("/init/:userId/:initAmt", jwtAuth, getInitialBusinesses);
router.get("/load/:userId/:num/:skip", jwtAuth, getMoreBusinesses);
// router.get("/byUser/:userId", jwtAuth, getBusinessesByUser);
router.get("/:id", getBusinessById);
router.get("/byName/:name", jwtAuth, getBusinessByName);
router.get("/no-auth-view/init/:initAmt", getInitialBusinesses);
router.get("/no-auth-view/load/:num/:skip", getMoreBusinesses);
router.del("/:userId/:deleteToken", jwtAuth, deleteBusiness);

/* Offers CRUD */
router.post("/offers/:id", jwtAuth, addOffer);
router.post("/offers/edit/:busId/:id", jwtAuth, editOffer);
router.put("/offers/:busId/:id", jwtAuth, deleteOffer);

/* Purchase Types CRUD */
router.post("/purchase-types/:id", jwtAuth, addPurchaseType);
router.post("/purchase-types/edit/:id/:typeId", jwtAuth, updatePurchaseType);
router.post("/purchase-types/delete/:id/:typeId", jwtAuth, deletePurchaseType);

/* Admin CRUD Routes */
router.post("/admin-only/verify/:requester/:id", jwtAuth, autoVerifyBusiness);
router.post("/admin-only/unverify/:requester/:id", jwtAuth, autoUnverifyBusiness);
router.post("/admin-only/delete/:requester/:id", jwtAuth, adminDeleteBusiness);

module.exports = router;
