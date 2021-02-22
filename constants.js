module.exports = {
  ROLES: {
    ADMIN: "admin",
    USER: "user",
    GUEST: "guest"
  },
  ERRORS: {
    ALREADY_REGISTERED:
      "A user has already registered with that email address.",
    TOO_MANY_BUSINESSES:
      "You already have registered 10 businesses. Each user is limited to 10 businesses" +
      " per user account. Consider adding your business using a different user account " +
      "(must be a different user email also).",
    ALREADY_REGISTERED_BUSINESS:
      "A user has already registered a business with the same name. If you suspect frau" +
      "dulence, please contact info@plugwin.com.",
    BAD_LOGIN: "Your login details could not be verified. Please try again.",
    INVALID_EMAIL: "You must enter a valid email address.",
    INVALID_ENTRY: "You have not filled out all the required fields.",
    INVALID_NAME: "You must enter a full name.",
    INVALID_PASSWORD: "You must enter a password.",
    INVALID_BUSINESS:
      "You are missing one or more required fields. Please try again.",
    JWT_EXPIRED:
      "For your safety, your session has expired. Please log back in and try your reque" +
      "st again.",
    JWT_FAILURE:
      "You are not authorized to access this content. If you feel this is in error, please contact an administrator.",
    NO_PERMISSION: "You do not have permission to access this content.",
    VERIFY_ACCOUNT_OUTSTANDING:
      "You do not have permission to access this content because you have not verified " +
      "your account",
    VERIFY_BUSINESS_EXPIRED:
      "Request denied. Your business verification request may have expired, or you used" +
      " an invalid token.",
    DELETE_BUSINESS_EXPIRED:
      "Request denied. Your business removal request may have expired, or you used an i" +
      "nvalid token.",
    VERIFY_ACCOUNT_EXPIRED:
      "Request denied. Your account verification request may have expired, has already " +
      "been completed, or you used an invalid token.",
    SAME_AS_OLD_PASSWORD:
      "The new password you set is the same as your most recent password. Please try ag" +
      "ain.",
    PASSWORD_CONFIRM_FAIL:
      "Your passwords did not match. Please attempt your request again after confirming" +
      " your password.",
    PASSWORD_MUST_MATCH: "Your passwords must match.",
    PASSWORD_RESET_EXPIRED:
      "Your password reset request may have expired. Please attempt to reset your passw" +
      "ord again from the login page.",
    PASSWORD_TOO_SHORT: "Your password must be at least eight characters long.",
    USER_NOT_FOUND: "No user was found."
  },
  OFFER_TYPES: {
    EARNED: "EARNED",
    DEFAULT: "DEFAULT",
    STRAT_TYPES: {
      REC_LOY: "REC_LOY",
      REC: "REC",
      LOY: "LOY"
    },
    PURCH_TYPES: {
      UNIQUE: "UNIQUE_PURCH",
      NUM_OF: "NUM_OF_VISITS",
      AMT: "AMT_SPENT"
    },
    METHOD_TYPES: {
      BY_PURCH: "P",
      BY_CAT: "C",
      DEFAULT: ""
    }
  }
};
