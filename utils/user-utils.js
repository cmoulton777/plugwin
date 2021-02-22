const jwt = require("jsonwebtoken");
const _ = require("lodash");
const moment = require("moment");
const authConfig = require("../config").auth;
const ROLES = require("../constants").ROLES;

// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

/**
 * standardizeUser - Standardizes user and strips unnecessary data
 * @param   {Object}  user  Full user object
 * @returns {Object}        Stripped down user information
 *
 */

const standardizeUsedOffer = off => ({
  id: _.get(off, "_id") || "",
  usage: _.get(off, "usage") || 0
});

// sort by date oldest to newest
const sortByDate = (a, b) => {
  return new Date(a.date) - new Date(b.date);
};

const standardizePurchaseHistoryByCategory = pHistory => {
  let all = {};
  pHistory.filter(p => p.category && typeof p.category !== 'undefined').map(p => p.category).forEach((c, ind) => {
    let total = {
      c: 0,
      a: 0,
      i: []
    }
    pHistory.filter(p => p.category === c).map(p => ({ available: p.available, instances: p.instances })).forEach(a => {
      total.c += a.available.count;
      total.a += a.available.amount;
      total.i = a.instances;
    });
    if (!all[c]) {
      all[c] = {};
      all[c].amount = 0;
      all[c].count = 0;
      all[c].instances = total.i;
    }
    all[c].amount += total.a;
    all[c].count += total.c;
    if (all[c].instances.length > 1) {
      all[c].instances.concat(total.i);
    }
    if (ind === pHistory.filter(p => p.category && typeof p.category !== 'undefined').length - 1) {
      all[c].instances = all[c].instances.sort(sortByDate);
    }
  });
  return all;
}

 const standardizePurchaseHistory = p => {
  p.instances = p.instances.filter(i => i.value > i.usedValue);
  const instances = p.instances && p.instances.length ?
    p.instances.map(i => ({
      id: i._id,
      date: i.date,
      count: i.quant,
      available: {
        amount: i.value > i.usedValue ? (i.value - i.usedValue) : 0,
        count: i.quant > i.quantUsed ? (i.quant - i.quantUsed) : 0
      }
    })) : null;
  return ({
    id: p._id,
    category: p.category,
    count: p.count,
    available: {
      amount: p.total > p.used ? (p.total - p.used) : 0,
      count: p.count > p.countUsed ? (p.count - p.countUsed) : 0
    },
    instances
  });
};

const standardizeSubscribedTo = sub => {
  let rawUsedOffers = _.get(sub, "usedOffers") || null;
  let rawPHistory = _.get(sub, "purchaseHistory") || [];
  rawPHistory = rawPHistory.length ? rawPHistory.filter(p => p.total > p.used) : [];
  const pHistory = rawPHistory.length ? rawPHistory.map(p => standardizePurchaseHistory(p)) : null;
  return {
    id: _.get(sub, "_id") || "",
    usedOffers:
      rawUsedOffers.length > 0
        ? _.mapKeys(
            rawUsedOffers
              .filter(o => !o.deleted)
              .map(off => standardizeUsedOffer(off)),
            o => o.id
          )
        : null,
    pHistory: pHistory ? _.mapKeys(pHistory, p => p.id) : null,
    cHistory: pHistory ? standardizePurchaseHistoryByCategory([...pHistory]) : null,
    purchases: _.get(sub, "purchases") || 0,
    appliedPurchases: _.get(sub, "appliedPurchases") || 0,
    visits: _.get(sub, "visits") || 0,
    appliedVisits: _.get(sub, "appliedVisits") || 0,
    plugged: _.get(sub, "plugged") || null,
    hasPlugger: !!(_.get(sub, "plugger")) || false,
    amountSpent: _.get(sub, "amountSpent") || 0,
    canRequest: _.get(sub, "activeRequestsCount")
      ? _.get(sub, "activeRequestsCount") < 5
      : true,
    appliedAmountSpent: _.get(sub, "appliedAmountSpent") || 0
  };
};

const standardizeUserToken = user => ({
  id: _.get(user, "_id") || "",
  firstName: _.get(user, "name.first") || "",
  lastName: _.get(user, "name.last") || "",
  email: _.get(user, "email") || "",
  role: _.get(user, "role") || ""
});

const standardizeUser = user => {
  let rawSubscribedTo = _.get(user, "subscribedTo") || [];
  return {
    id: _.get(user, "_id") || "",
    firstName: _.get(user, "name.first") || "",
    lastName: _.get(user, "name.last") || "",
    email: _.get(user, "email") || "",
    role: _.get(user, "role") || "",
    notifications: _.get(user, "notifications") || [],
    vendorAccounts: _.get(user, "vendorAccounts") || [],
    subscribedTo:
      rawSubscribedTo.length > 0
        ? _.mapKeys(
            rawSubscribedTo.map(sub => standardizeSubscribedTo(sub)),
            s => s.id
          )
        : null
  };
};

/**
 *  generateJWT - Signs JWT with user data
 *  @param   {Object} user  Object containing user data to sign JWT with
 *  @returns {Object}       JSON Web Token for authenticated API requests
 */
const generateJWT = user => ({
  token: jwt.sign(standardizeUserToken(user), authConfig.secret, {
    expiresIn: authConfig.jwtExpiration
  }),
  expiration: authConfig.jwtExpiration
});

/**
 * getRole - Returns a numerical value, which corresponds to the user's role
 * @param   {String}  role  User's role in string form from the database
 * @returns {Number}        User's role in number form for comparison
 */
const getRole = role => {
  switch (role) {
    case ROLES.ADMIN:
      return 2;
    case ROLES.USER:
      return 1;
    default:
      return 0; // handles case of ROLES.GUEST
  }
};

const cleanName = name => {
  let formattedName = {
    first: name.first.trim(),
    last: name.last.trim()
  };
  Object.keys(formattedName).forEach(k => {
    formattedName[k] = formattedName[k].charAt(0).toUpperCase() + formattedName[k].slice(1);
  });
  return formattedName;
};

module.exports = {
  generateJWT,
  getRole,
  standardizeUser,
  standardizeUserToken,
  standardizeSubscribedTo,
  standardizePurchaseHistory,
  standardizePurchaseHistoryByCategory,
  cleanName
};
