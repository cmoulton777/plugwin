const _ = require("lodash");
const ROLES = require("../constants").ROLES;
const moment = require("moment");

/**
 * helper for standardizeBusiness with excludeExpired options set to true
 * @param {*} expDate
 */
const getDateDifference = expDate => {
  let expiration = null;
  let dateDifference = -1;
  if (expDate) {
    expiration = new Date(expDate);
    const today = new Date();
    dateDifference = parseInt(
      Math.ceil(
        (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  }
  return dateDifference;
};

/**
 * standardizeOffers
 * 
 * @param {*} business 
 * @param {*} excludeExpired 
 * @param {*} earnedOnly 
 */
const standardizeOffers = (business, excludeExpired = false, earnedOnly = false, actionRequiredOnly = false) => {
  let offers = [];
  if (_.get(business, "offersLength") > 0) {
    offers = _.get(business, "offers").filter(o => !o.deleted);
  }
  if (offers.length > 0 && excludeExpired) {
    offers = offers.filter(
      o => !o.expDate || getDateDifference(o.expDate) >= 0
    );
  }
  if (offers.length > 0 && earnedOnly) {
    offers = offers.filter(o => o.offerType === "EARNED");
  }
  if (offers.length > 0 && actionRequiredOnly) {
    offers = offers.filter(o => o.vendorActionRequired);
  }
  return offers;
}

/**
 * standardizeBusiness - Standardizes business and strips unnecessary data
 * @param   {Object}  business  Full business object
 * @param   {Boolean} excludeExpired Exclude expired offers or not
 * @returns {Object}        Stripped down business information
 */
const standardizeBusiness = (business, excludeExpired = false) => {
  let purchaseTypes = _.get(business, "purchaseTypes") || [];
  if (purchaseTypes && purchaseTypes.length) {
    purchaseTypes = purchaseTypes.filter(p => !p.deleted);
  }
  return {
    id: _.get(business, "_id") || "",
    userId: _.get(business, "user") || "",
    verified: _.get(business, "verified") || false,
    theme: {
      primary: _.get(business, 'primaryColor') || "",
      secondary: _.get(business, 'secondaryColor') || ""
    },
    // 'del' represent whether or not the business can be deleted via email token
    del: !_.get(business, "deleteAccountExpires")
      ? false
      : !moment().isAfter(_.get(business, "deleteAccountExpires")),
    name: _.get(business, "name") || "",
    email: _.get(business, "email") || "",
    category: _.get(business, "category") || 1001,
    subcategory: _.get(business, "subcategory") || 2014,
    links: _.get(business, "links") || [],
    description: _.get(business, "description") || "",
    purchaseTypes,
    categories: _.get(business, "categories") || [],
    offers: standardizeOffers(business, excludeExpired)
  };
};

module.exports = {
  standardizeBusiness,
  standardizeOffers
};
