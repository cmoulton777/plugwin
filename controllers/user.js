const crypto = require("crypto-promise");
const moment = require("moment");
const _ = require("lodash");
const { paramCase } = require("change-case");
const ObjectId = require('mongoose').Types.ObjectId;
const User = require("../models/user");
const Plug = require("../models/plug");
const Business = require("../models/business");
const userUtils = require("../utils/user-utils");
const businessUtils = require("../utils/business-utils");
const emailUtils = require("../utils/email-utils");
const validationUtils = require("../utils/validation-utils");
const { OFFER_TYPES } = require("../constants");

const { standardizeUser, standardizeSubscribedTo, standardizePurchaseHistory, standardizePurchaseHistoryByCategory } = userUtils;
const { standardizeOffers } = businessUtils;
const { filterSensitiveData } = validationUtils;
const { sendEmail } = emailUtils;

/**
 * getUsers  - Returns JSON for all users
 * @returns {Array} - Array of users
 */
exports.getUsers = async (ctx, next) => {
  try {
    const users = await User.find({});
    const filteredUsers = users.map(user => standardizeUser(user));
    ctx.status = 200;
    ctx.body = {
      users: filteredUsers
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * getUser  - Returns JSON for specified user
 * @returns {Object}  - Single user object
 */
exports.getUser = async (ctx, next) => {
  try {
    const user = await User.findById(ctx.params.id);
    ctx.status = 200;
    ctx.body = {
      user: standardizeUser(user)
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getPluggerConfirmation = async (ctx, next) => {
  const { plugId } = ctx.params;
  try {
    const plug = await Plug.findOne({ id: plugId });
    // const { visits } = plug;
    // const visitors = await Promise.all(visits.map(async (v) => {
    //   const visitor = await User.findById(v._id);
    //   return visitor;
    // }));
    // visitors // [{ _id: lkwfasf, firstName, lastName, email, ...}]
    if (!plug) {
      ctx.status = 422;
      ctx.body = {
        error: "ERROR"
      }
    } else {
      const user = await User.findById(plug.orig);
      if (user) {
        ctx.status = 200;
        ctx.body = {
          message: `Did you hear about us from ${user.fullName} (${user.email})?`
        };
      } else {
        ctx.status = 422;
        ctx.body = {
          error: "ERROR"
        }
      }
    }
    await next();
  } catch(err) {
    ctx.throw(500, err);
  }
};

exports.basicPlugRedirect = async (ctx, next) => {
  try {
    // getting a plug by 'id'
    const plug = await Plug.findOne({ id: plugId });
    // if it doesn't exist, return an "Unprocessable Entity" error code and error in desired structure
    if (!plug) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          { error: "The plug referenced by the given id does not exist." }
        ]
      };
    } else { // plug does exist, use business ref on plug to find business
      const business = await Business.findById(plug.business);
      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: "The business referenced by the given id does not exist on Plugwin."
            }
          ]
        };
      } else {
        ctx.status = 200;
        ctx.body = {
          link: business.links[0].val
        };
      }
    }
    await next();
  } catch (err) {
    ctx.throw(422, err);
  }
};

exports.plugRedirect = async (ctx, next) => {
  const { userId, plugId } = ctx.params;
  try {
    const plug = await Plug.findOne({ id: plugId });
    if (!plug) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          { error: "The plug referenced by the given id does not exist." }
        ]
      };
    } else {
      const user = await User.findById(userId);
      if (!user) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            { error: "The user referenced by the given id does not exist." }
          ]
        };
      } else {
        const business = await Business.findById(plug.business);
        if (!business) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: "The business referenced by the given id does not exist."
              }
            ]
          };
        } else {
          if (plug.orig.toString() === userId || !business.verified) {
            ctx.status = 200;
            ctx.body = {
              link: business.links[0].val
            };
          } else {
            const finalCallback = (result, errs) => {
              if (errs) {
                ctx.status = 422;
                ctx.body = {
                  errors: [{ error: errs.toString() }]
                };
              } else {
                ctx.status = 200;
                ctx.body = {
                  link: business.links[0].val
                };
              }
            };
            const plugCallback = async (result, errors) => {
              if (errors) {
                ctx.status = 422;
                ctx.body = {
                  errors: [{ error: errors.toString() }]
                };
              } else {
                plug.visits.push({
                  _id: new ObjectId(user._id)
                });
                plug.visitCount += 1;
                await plug.save().then(finalCallback);
              }
            };
            const subObj = _.mapKeys(user.subscribedTo, s => s._id);
            if (!(subObj && subObj[business._id])) {
              /* subscribe if not already subscribed (add to user subscribedTo, add user to business subscribed array)*/
              user.subscribedTo.push({
                _id: new ObjectId(plug.business),
                plugger: new ObjectId(plug.orig)
              });
              business.subscribed.push({
                _id: new ObjectId(user._id),
                name: user.fullName,
                email: user.email
              });
              await business.save().then(async (r, e) => {
                if (e) {
                  ctx.status = 422;
                  ctx.body = {
                    errors: [{ error: e.toString() }]
                  };
                } else {
                  await user.save().then(plugCallback);
                }
              });
            } else {
              if (!subObj.plugger) {
                await User.findOneAndUpdate(
                  { _id: userId, "subscribedTo._id": business },
                  {
                    $set: {
                      "subscribedTo.$.plugger": plug.orig
                    }
                  }
                ).then(plugCallback);
              } else {
                await plugCallback();
              }
            }
          }
        }
      }
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.generatePlug = async (ctx, next) => {
  const { id, business } = ctx.params;
  try {
    const bus = await Business.findById(business);
    if (!bus) {
      ctx.status = 422;
      ctx.body = {
        errors: [{ error: "Business reference is not a valid business id" }]
      };
    } else {
      let plug = new Plug({
        orig: new ObjectId(id),
        business: new ObjectId(business)
      });
      await plug.save().then(async (res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [{ error: err }]
          };
        } else {
          const user = await User.findById(id);
          if (!user) {
            ctx.status = 422;
            ctx.body = {
              errors: [{ error: "User reference is not a valid user id" }]
            };
          } else {
            const plugLink = `${
              ctx.request.header.origin
            }/plug/${paramCase(bus.name)}/${res.id}`;
            const finalCallback = (result, errs) => {
              if (errs) {
                ctx.status = 422;
                ctx.body = {
                  errors: [{ error: errs.toString() }]
                };
              } else {
                ctx.status = 200;
                ctx.body = {
                  message: "Successfully generated a unique plug!",
                  link: plugLink
                };
              }
            };
            const subObj = _.mapKeys(user.subscribedTo, s => s._id);
            if (!subObj || !subObj[business]) {
              /* subscribe if not already subscribed (add to user subscribedTo, add user to business subscribed array), mark plugged, add plug to user's array of plug references */
              user.subscribedTo.push({
                _id: new ObjectId(business),
                plugged: plugLink
              });
              bus.subscribed.push({
                _id: new ObjectId(id),
                name: user.fullName,
                email: user.email
              });
              user.plugs.push({ _id: new ObjectId(res._id) });
              await bus.save().then(async (r, e) => {
                if (e) {
                  ctx.status = 422;
                  ctx.body = {
                    errors: [{ error: e.toString() }]
                  };
                } else {
                  await user.save().then(finalCallback);
                }
              });
            } else {
              await User.findOneAndUpdate(
                { _id: id, "subscribedTo._id": business },
                {
                  $set: {
                    "subscribedTo.$.plugged": plugLink
                  },
                  $push: {
                    plugs: res._id
                  }
                }
              ).then(finalCallback);
            }
          }
        }
      });
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * Helper method for redeem offer and plugs
 * ('subscription' functionality)
 *
 * @param {*} subscribedTo
 * @param {*} busId
 * @param {*} userId
 * @param {*} offId
 */
const addSub = async (subscribedTo, busId, userId, offId, userRef) => {
  let bus = await Business.findById(busId);

  if (bus) {
    let newSub = null;
    if (offId) {
      let usedOffer = {
        _id: new ObjectId(offId),
        usage: 1
      };

      newSub = {
        _id: new ObjectId(busId),
        usedOffers: [usedOffer]
      };
    } else {
      newSub = {
        _id: new ObjectId(busId)
      };
    }

    let subscribed = bus.subscribed.slice();

    let subObj = _.mapKeys(subscribed, s => s._id);

    subscribedTo.push(newSub);

    if (!subObj[userId] || typeof subObj[userId] === "undefined") {
      subscribed.push({
        _id: new ObjectId(userId),
        name: userRef.fullName,
        email: userRef.email
      });
      await bus.update({ subscribed });
    }
  }

  return Promise.resolve(subscribedTo);
};

exports.requestCredit = async (ctx, next) => {
  const { user, business, purchaseType, description } = ctx.request.body;
  try {
    const use = await User.findById(user);
    if (!use) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error:
              "Unable to retrieve the user account associated with this request"
          }
        ]
      };
    } else if (
      _.mapKeys(use.subscribedTo, b => b._id)[business] &&
      _.mapKeys(use.subscribedTo, b => b._id)[business].activeRequestsCount > 5
    ) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error:
              "You have multiple active credit requests that still need to be handled. You cannot submit any more at this time."
          }
        ]
      };
    } else {
      // if the user is not already subscribed, add the subscription
      if (!_.mapKeys(use.subscribedTo, b => b._id)[business]) {
        await addSub(use.subscribedTo, business, user, null, use).then(
          async subscribedTo => {
            if (subscribedTo) {
              await use.update({ subscribedTo });
            }
          }
        );
      }
      const bus = await Business.findById(business);
      if (!bus) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            { error: "Business associated with request could not be found" }
          ]
        };
      } else {
        let purchaseTypeName = purchaseType ? _.mapKeys(bus.purchaseTypes, p => p._id)[purchaseType].description : null;
        const requestRef = Object.assign({}, ctx.request.body, {
          userName: use.fullName,
          busName: bus.name,
          email: use.email
        }, purchaseTypeName ? { purchaseTypeName } : null);
        const busUser = bus.user;
        await User.findByIdAndUpdate(
          busUser,
          {
            $push: {
              notifications: {
                $each: [{ description: `REQ${JSON.stringify(requestRef)}`, forCredit: true, expiration: moment(moment()).add(14, 'days') }],
                $position: 0
              }
            }
          },
          { new: true }
        ).then(async (res, err) => {
          if (err) {
            ctx.status = 422;
            ctx.body = {
              errors: [{ error: "Request could not be processed" }]
            };
          } else {
            let subRecord = _.mapKeys(use.subscribedTo, b => b._id)[business];
            subRecord.activeRequestsCount += 1;
            await User.findOneAndUpdate(
              { _id: user, "subscribedTo._id": business },
              {
                $push: {
                  notifications: {
                    $each: [
                      {
                        description: `Your request was successfuly submitted. You will be notified when ${
                          bus.name
                        } responds.`
                      }
                    ],
                    $position: 0
                  }
                },
                $set: {
                  "subscribedTo.$": subRecord
                }
              }
            ).then(() => {
              ctx.status = 200;
              ctx.body = {
                message: `Your request was successfuly submitted. You will be notified when ${
                  bus.name
                } responds.`
              };
            });
          }
        });
      }
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/* Email in Text utilities */

const emailInTextRegex = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

const getEmailFromText = text => text.match(emailInTextRegex);

const hasEmail = text => getEmailFromText(text) != null;

// sort by date, oldest to newest
const sortByDate = (a, b) => {
  return new Date(a.date) - new Date(b.date);
};

/**
 *
 * creditUser - credit given user account at subscribedTo area that corresponds with the given business, and update user totals,
 * if description, add a unique purchase to the user's purchase array with the associated amounts
 * @param ctx - context
 * @param next - proceed to next method in succesion or return context body to client
 */
exports.creditUser = async (ctx, next) => {
  const { id } = ctx.params;
  const { business, visits, amountSpent, purchaseType, onOrAfter } = ctx.request.body;
  const isApprovedRequest = typeof ctx.request.body.requestApproved !== 'undefined' && ctx.request.body.requestApproved;
  let description = ctx.request.body.description ? ctx.request.body.description.trim() : "";
  const purchasesCredit = ctx.request.body.purchases;
  const addPurchase = purchaseType && purchaseType.length;
  const isEmail = id.indexOf("@") > -1;
  try {
    let user = null;
    let newUser = false;
    let newSub = false;
    const bus = await Business.findById(business);

    if (isEmail) {
      user = await User.findOne({
        email: id.toLowerCase()
      });
      if (!user) {
        const buffer = await crypto.randomBytes(10);
        const resetBuffer = await crypto.randomBytes(24);
        const password = buffer.toString("hex");
        const resetToken = buffer.toString("hex");
        user = new User({
          email: id,
          password,
          method: 'local',
          name: {
            first: " ",
            last: " "
          },
          resetPasswordToken: resetToken,
          resetPasswordExpires: moment().add(14, "day")
        });
        const message = {
          subject: `${bus.name} Rewards`,
          html: `<p>Customer of ${bus.name},<br/></br><br/>You are receiving this because ${bus.name} has awarded you purchase credit. To take advantage of rewards and coupons from ${bus.name}:<br/></br><br/><a href=${ `${ctx.request.header.origin}/reset-password/${resetToken}/credited`}>Click here to get started!</a><br/></br><br/>Otherwise, you can access your account <a href=${`${ctx.request.header.origin}`}>here</a> using:
          <br/><br/><ul><li style="list-style: none;">Email: ${id}</li><br/><br/><li style="list-style: none;">Temporary Password: ${password}</li></ul><br/><br/> OR through Google or Facebook so long as you use the same email.`
        };
        await sendEmail(id, message).then(async() => {
          newUser = true;
          await user.save();
        }).catch(err => {
          ctx.status = 422;
          ctx.body = {
            errors: [{error: `The email could not be sent to ${id}. Please confirm this is the email address you intended to use and try again.`}]
          }
        });
      }
    } else {
      user = await User.findById(id);
      if (!user) {
        ctx.status = 422;
        ctx.body = {
          errors: [{error: `Selected user could not be found, please try again.`}]
        }
        return next();
      }
    }
      let notifications = [];
      if (user.notifications) {
        notifications = user.notifications.slice();
      }
      let subs = _.mapKeys(user.subscribedTo, s => s._id);
      // if not subscribed, subscribe (just in case)
      if (!subs[business]) {
        await addSub(user.subscribedTo, business, user._id, null, user).then(
          async subscribedTo => {
            if (subscribedTo) {
              newSub = true;
              await user.update({ subscribedTo });
            }
          }
        );
      }
      notifications.unshift({
        description: `${bus.name} has credited you for making ${
          purchasesCredit > 1 ? `${purchasesCredit} purchases` : "a purchase"
        } totaling $${Number(amountSpent).toFixed(2)} over your last ${
          visits > 1 ? `${visits} visits.` : "visit."
        }${newSub ? ` You can now view rewards from ${bus.name} you are eligible for by clicking 'Eligible Offers' in the menu.` : ''}`
      });
      let subData = !subs[business]
        ? _.mapKeys(user.subscribedTo, s => s._id)[business]
        : subs[business];
  
      if (addPurchase) {
        if (!subData.purchaseHistory) {
          subData.purchaseHistory = [];
        }
        subData.availablePurchaseQuantity += Number(purchasesCredit);
        subData.availablePurchaseAmountSpent += Number(amountSpent);
        
        const pType = _.mapKeys(bus.purchaseTypes.filter(p => !p.deleted), t => t._id)[purchaseType];
        const instanceDate = onOrAfter ? new Date(onOrAfter) : new Date();
        let myPurchaseHistory = subData.purchaseHistory ? _.mapKeys(subData.purchaseHistory, p => p._id)[purchaseType] : null;
        if (myPurchaseHistory) {
          if (pType && pType.category && !myPurchaseHistory.category) {
            myPurchaseHistory.category = new ObjectId(pType.category);
          }
          myPurchaseHistory.total += Number(amountSpent);
          myPurchaseHistory.count += Number(purchasesCredit);
          if (!myPurchaseHistory.instances) {
            myPurchaseHistory.instances = [];
          }
          myPurchaseHistory.instances.push({
            id: new ObjectId(purchaseType),
            date: instanceDate,
            quant: Number(purchasesCredit),
            value: Number(amountSpent)
          });
          myPurchaseHistory.instances = myPurchaseHistory.instances.sort(sortByDate);
        } else {
          let newPurch = ({
            _id: new ObjectId(purchaseType),
            count: Number(purchasesCredit),
            total: Number(amountSpent),
            instances: [{
              id: new ObjectId(purchaseType),
              date: instanceDate,
              quant: Number(purchasesCredit),
              value: Number(amountSpent)
            }]
          });
          if (pType && pType.category) {
            newPurch.category = new ObjectId(pType.category);
          }
          subData.purchaseHistory.push(newPurch);
        }
      }

      subData.visits.count += Number(visits);
      subData.purchases.count += Number(purchasesCredit);
      subData.amountSpent.count += Number(amountSpent);

      if (isApprovedRequest) {
        subData.activeRequestsCount -= 1;
      }

      /*
       * Use a user reference and automatically send updates via email for earned offers made available as a result of new credit being available
       * that don't automatically get redeemed, and then automatically redeem and send vendor confirmation with description with button to notify 
       * user that they have sent the reward as described in the offer.description in client ("Your reward for .... is on it's way!") --> last part will be handled elsewhere
      */
      const updateUser = async (r, e) => {
        await User.findOneAndUpdate(
          {
            _id: user._id,
            "subscribedTo._id": subData._id
          },
          {
            notifications,
            $set: {
              "subscribedTo.$": subData
            }
          },
          { new: true }
        ).then(async(res, err) => {
          if (err) {
            ctx.status = 422;
            ctx.body = {
              errors: [{ error: err.toString() }]
            };
          } else {
            let userName = res.fullName.trim();
            let nameSegment = userName ? `${userName} (${res.email})` : `guest${res._id.substr(user._id.length-10)} (${res.email})`;
            busNotifications.push({ description: newUser ? `You have successfully added a new customer (${id}) to ${bus.name} Rewards and credited their customer account.`
            : `You have successfully credited the account of ${
              nameSegment
            }.` });
            await User.findByIdAndUpdate(bus.user,
              {
                $push: {
                  notifications: {
                    $each: [...busNotifications],
                    $position: 0
                  }
                }
              }
            ).then((result, error) => {
              if (error) {
                console.log(error);
              } else {
                ctx.status = 200;
                ctx.body = {
                  message: `You have successfully credited the account of ${
                    nameSegment
                  }.`
                };
              }
            });
          }
        });
      };
      let busNotifications = [];
      let earnedOffers = standardizeOffers(bus, true, true);
      const isEarnedOffers = earnedOffers && earnedOffers.length;
      if (!subData.plugger && (!description || !hasEmail(description))) {
        if (isEarnedOffers) {
          let autoOffers = earnedOffers.filter(o => o.vendorActionRequired);
          if (autoOffers && autoOffers.length) {
            if (autoOffers.length === 1) {
              let off = autoOffers[0];
              let desc = off.description.trim();
              let quantity = 0;
              if (generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                let offData = compactDataForRedeemOffer(off.earnedOffer);
                subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                quantity += 1;
                if (subData.usedOffers) {
                  let offerData = _.mapKeys(subData.usedOffers, o => o._id)[off._id];
                  if (offerData && offerData.usage) {
                    while (_.mapKeys(subData.usedOffers, o => o._id)[off._id].usage < off.maxUsageCount && generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                      subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                      quantity++;
                    }
                  }
                }
                const redeemRef = Object.assign({}, {
                  user: user._id,
                  busName: bus.name,
                  userName: user.fullName,
                  email: user.email,
                  description: desc,
                  isRedeemedOffer: true,
                  quantity
                });
                busNotifications.push({
                  description: `REQ${JSON.stringify(redeemRef)}`
                });
                notifications.unshift({
                  description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                  ${bus.name} has been notified and you should be receiving your reward${quantity > 1 ? "s" : ""} shortly.`
                });
              }
            } else {
              autoOffers.forEach(off => {
                if (generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                  let offData = compactDataForRedeemOffer(off.earnedOffer);
                  let desc = off.description.trim();
                  subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                  const redeemRef = Object.assign({}, {
                    user: user._id,
                    busName: bus.name,
                    userName: user.fullName,
                    email: user.email,
                    description: desc,
                    isRedeemedOffer: true
                  });
                  busNotifications.push({
                    description: `REQ${JSON.stringify(redeemRef)}`
                  });
                  notifications.unshift({
                    description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                    ${bus.name} has been notified and you should be receiving your reward shortly.`
                  });
                }
              });
            }
          }
          // redeem each offer asynchronously and use remaining sub data and then after, 
          // return remaining subData values check progress for offer on non-actionable, and generate email
         if (subData) {
            let nonAutoOffers = earnedOffers.filter(o => !o.vendorActionRequired && generateAggregateProgressForOffer(o.earnedOffer, subData) >= 1);
            if (nonAutoOffers && nonAutoOffers.length) {
              await sendRedeemableRewardsEmail(nonAutoOffers, subData, bus, user.fullName, user.email, ctx.request.header.origin).then(sent => {
                if (!sent || !sent.message) {
                  ctx.status = 422;
                  ctx.body = {
                    errors: [
                      {
                        error: "Redeem rewards email could not be sent"
                      }
                    ]
                  };
                }
              });
            }
          }
        }
        await updateUser();
      } else {
        let plugger = null;
        if (subData.plugger) {
          if (subData.plugger.toString() !== bus.user.toString()) {
            plugger = await User.findById(subData.plugger);
          }
        } else {
          let email = getEmailFromText(description);
          if (!!(email[0])) {
            // remove trailing period (if any)
            let plugEmail = email[0].lastIndexOf(".") === email[0].length - 1 ? email[0].slice(0, -1) : email[0];
            plugEmail = plugEmail.toLowerCase();
            let _busUser = await User.findById(bus.user);
            if (plugEmail !== user.email.toLowerCase() && _busUser.email.toLowerCase() !== plugEmail) {
              plugger = await User.findOne({"email": plugEmail});
              if (plugger && plugger.subscribedTo && (!(plugger.subscribedTo.length > 0) || !(_.mapKeys(plugger.subscribedTo, s => s._id)[business]))) {
                await addSub(plugger.subscribedTo, business, plugger._id, null, plugger);
              }
              if (plugger) {
                subData.plugger = ObjectID(plugger._id);
              }
            }
          }
        }
        let pluggerSubs = plugger ? _.mapKeys(plugger.subscribedTo, s => s._id) : null;
        let plugSubData = pluggerSubs ? pluggerSubs[business] : null;
        if (plugSubData) {
          plugSubData.visits.recommendeeCount += Number(visits);
          plugSubData.purchases.recommendeeCount += Number(purchasesCredit);
          plugSubData.amountSpent.recommendeeCount += Number(amountSpent);
          plugger.notifications.unshift({
            description: `${
              bus.name
            } has credited one of your recommendees, for making ${
              purchasesCredit > 1 ? `${purchasesCredit} purchases` : "a purchase"
            } totaling $${Number(amountSpent).toFixed(2)} over their last ${
              visits > 1 ? `${visits} visits.` : "visit."
            } Way to plug and really win, ${plugger.name.first}! You can check out your progress on rewards by clicking 'Eligible Offers' in the menu.`
          });
          if (isEarnedOffers) {
            let autoOffers = earnedOffers.filter(o => o.vendorActionRequired);
            if (autoOffers && autoOffers.length) {
              if (autoOffers.length === 1) {
                let off = autoOffers[0];
                let desc = off.description.trim();
                let quantity, pluggerQuantity = 0;
                let offData = compactDataForRedeemOffer(off.earnedOffer);
                let redeemRef = null;
                if (generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                  subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                  quantity += 1;
                  if (subData.usedOffers) {
                    let offerData = _.mapKeys(subData.usedOffers, o => o._id)[off._id];
                    if (offerData && offerData.usage) {
                      while (_.mapKeys(subData.usedOffers, o => o._id)[off._id].usage < off.maxUsageCount && generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                        subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                        quantity++;
                      }
                    }
                  }
                  redeemRef = Object.assign({}, {
                    user: user._id,
                    busName: bus.name,
                    userName: user.fullName,
                    email: user.email,
                    description: desc,
                    isRedeemedOffer: true,
                    quantity
                  });
                  busNotifications.push({
                    description: `REQ${JSON.stringify(redeemRef)}`
                  });
                  notifications.unshift({
                    description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                    ${bus.name} has been notified and you should be receiving your reward${quantity > 1 ? "s" : ""} shortly.`
                  });
                }
                if (generateAggregateProgressForOffer(off.earnedOffer, plugSubData) >= 1) {
                  plugSubData = redeemOfferInContext(plugSubData, offData.user, offData.rec, off._id);
                  pluggerQuantity += 1;                  
                  if (plugSubData.usedOffers) {
                    let offerData = _.mapKeys(plugSubData.usedOffers, o => o._id)[off._id];
                    if (offerData && offerData.usage) {
                      while (_.mapKeys(plugSubData.usedOffers, o => o._id)[off._id].usage < off.maxUsageCount && generateAggregateProgressForOffer(off.earnedOffer, plugSubData) >= 1) {
                        plugSubData = redeemOfferInContext(plugSubData, offData.user, offData.rec, off._id);
                        plugQuantity++;
                      }
                    }
                  }
                  redeemRef = Object.assign({}, {
                    user: plugger._id,
                    busName: bus.name,
                    userName: plugger.fullName,
                    email: plugger.email,
                    description: desc,
                    isRedeemedOffer: true,
                    pluggerQuantity
                  });
                  busNotifications.push({
                    description: `REQ${JSON.stringify(redeemRef)}`
                  });
                  plugger.notifications.unshift({
                    description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                    ${bus.name} has been notified and you should be receiving your reward${pluggerQuantity > 1 ? "s" : ""} shortly.`
                  });
                }
              } else {
                autoOffers.forEach(off => {
                  let offData = compactDataForRedeemOffer(off.earnedOffer);
                  let desc = off.description.trim();
                  let redeemRef = null;
                  if (generateAggregateProgressForOffer(off.earnedOffer, subData) >= 1) {
                    subData = redeemOfferInContext(subData, offData.user, offData.rec, off._id);
                    redeemRef = Object.assign({}, {
                      user: user._id,
                      busName: bus.name,
                      userName: user.fullName,
                      email: user.email,
                      description: desc,
                      isRedeemedOffer: true
                    });
                    busNotifications.push({
                      description: `REQ${JSON.stringify(redeemRef)}`
                    });
                    notifications.unshift({
                      description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                      ${bus.name} has been notified and you should be receiving your reward shortly.`
                    });
                  }
                  if (generateAggregateProgressForOffer(off, plugSubData) >= 1) {
                    plugSubData = redeemOfferInContext(plugSubData, offData.user, offData.rec, off._id);
                    redeemRef = Object.assign({}, {
                      user: plugger._id,
                      busName: bus.name,
                      userName: plugger.fullName,
                      email: plugger.email,
                      description: desc,
                      isRedeemedOffer: true
                    });
                    busNotifications.push({
                      description: `REQ${JSON.stringify(redeemRef)}`
                    });
                    plugger.notifications.unshift({
                      description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
                      ${bus.name} has been notified and you should be receiving your reward shortly.`
                    });
                  }
                });
              }
            }
            // redeem each offer asynchronously and use remaining sub data and then after, 
            // return remaining subData values check progress for offer on non-actionable, and generate email
           if (subData && plugSubData) {
              let nonAutoOffers = earnedOffers.filter(o => !o.vendorActionRequired && generateAggregateProgressForOffer(o.earnedOffer, subData) >= 1);
              if (nonAutoOffers && nonAutoOffers.length) {
                await Promise.all([sendRedeemableRewardsEmail(nonAutoOffers, subData, bus, user.fullName, user.email, ctx.request.header.origin),
                  sendRedeemableRewardsEmail(nonAutoOffers, plugSubData, bus, plugger.fullName, plugger.email, ctx.request.header.origin)]).then(sent => {
                  if (!sent || !sent.message) {
                    console.error("Rewards email could not be sent");
                  }
                });
              }
            }
          }
          await plugger.save().then(updateUser);
        } else {
          await updateUser();
        }
      }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.redeemAndNotify = async (ctx, next) => {
  const { userId, busId, offId } = ctx.params;
  const { body } = ctx.request;

  try {
    const user = await User.findById(userId);
    if (user) {
      let subData = user.subscribedTo && user.subscribedTo.length ? _.mapKeys(user.subscribedTo, s => s._id)[busId] : null;
      if (subData) {
        const bus = await Business.findById(busId);
        if (!bus) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              { error: "The business referenced in the request parameters could not be found."}
            ]
          };
        } else {
          const isOffer = bus.offers && _.mapKeys(bus.offers, o => o._id) && _.mapKeys(bus.offers, o => o._id)[offId];
          if (!isOffer) {
            ctx.status = 422;
            ctx.body = {
              errors: [
                { error: "The offer referenced in the request parameters could not be found." }
              ]
            }
          } else {
            const desc = _.mapKeys(bus.offers, o => o._id)[offId].description.trim();
            subData = redeemOfferInContext(subData, body.user, body.rec, offId);
            const redeemRef = Object.assign({}, {
              user: user._id,
              busName: bus.name,
              userName: user.fullName,
              email: user.email,
              description: desc,
              isRedeemedOffer: true
            });
            let busDesc = [{
              description: `REQ${JSON.stringify(redeemRef)}`
            }];
            user.notifications.unshift({
              description: `You have earned a reward for the following offer: ${desc}${desc.lastIndexOf(".") === desc.length - 1 ? "" : "."} 
              ${bus.name} has been notified and you should be receiving your reward shortly.`
            });
            await User.findByIdAndUpdate(bus.user, {
              $push: {
                notifications: {
                  $each: [...busDesc],
                  $position: 0
                }
              }
            }).then(async(res, err) => {
              if (err) {
                ctx.status = 422;
                ctx.body = {
                  errors: [
                    { error: "Unable to redeem this offer due to the following error that occurred when trying to send the request: \n" + err }
                  ]
                }
              } else {
                await User.findOneAndUpdate({_id: user._id, "subscribedTo._id": subData._id}, {
                  notifications: user.notifications,
                  $set: {
                    "subscribedTo.$": subData
                  }
                }, {new: true}).then((result, error) => {
                  if (error) {
                    ctx.status = 422;
                    ctx.body = {
                      errors: [
                        { error: "Unable to redeem this offer due to the following error that occurred when trying to send the request: \n" + error }
                      ]
                    }
                  } else {
                    ctx.status = 200;
                    ctx.body = {
                      message: `You have successfully notified ${bus.name} of your completion of the following offer: ${desc}. Your reward will be on its way shortly!`,
                      notifications: result.notifications
                    }
                  }
                });
              }
            });
          }
        }
      } else {
        ctx.status = 422;
        ctx.body = {
          errors: [
            { description: "The user is not subscribed to this business." }
          ]
        }
      }
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          { description: "The user referenced in the request parameters could not be found." }
        ]
      }
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

const sendRedeemableRewardsEmail = async (earnedOffers, subData, bus, name, email, origin) => {
    let toEmail = [];
    earnedOffers.forEach(off => {
      toEmail.push({
        title: off.title,
        description: off.description.trim()
      });
    });
    const rewardsBody = toEmail.map(o => (
      `<li>${o.title}: ${o.description}</li>`
    ))
    const message = {
      subject: `${bus.name} Rewards`,
      html: `<p>${name},<br/></br><br/>You are receiving this because ${bus.name} has awarded you purchase credit. 
      Here are the rewards you are now eligible for from ${bus.name}:<br/></br><br/><ul>${rewardsBody}</ul><br/>
      <br/><a href=${`"${origin}/bus/${paramCase(bus.name)}/${bus._id}"`}>Click here to redeem your rewards now!</a></p>`
    };
    let response = await sendEmail(email, message);
    return Promise.resolve(response);
};

const compareMetric = (metric, quants, isUser = true) => {
  let count = 0;
  if (!quants || !quants.visits) {
    return count;
  }
  const {
    visits,
    appliedVisits,
    purchases,
    appliedPurchases,
    amountSpent,
    appliedAmountSpent
  } = quants;
  const subPropType = isUser
    ? "count"
    : "recommendeeCount";
  switch (metric) {
    case OFFER_TYPES.PURCH_TYPES.UNIQUE:
      count = purchases[subPropType] - appliedPurchases[subPropType];
      break;
    case OFFER_TYPES.PURCH_TYPES.NUM_OF:
      count = visits[subPropType] - appliedVisits[subPropType];
      break;
    case OFFER_TYPES.PURCH_TYPES.AMT:
      count = amountSpent[subPropType] - appliedAmountSpent[subPropType];
      break;
    default:
      break;
  }
  return count;
};

const compareByType = (earnedOffer, transHistory, isPT = false) => {
  let count = 0;
  transHistory = Object.assign({}, standardizeSubscribedTo(transHistory));
  if (!earnedOffer.userQuant) {
    return count;
  }
  let { userMetric, noEarlierThan, userQuant } = earnedOffer;
  let transMap = null;
  if (isPT) {
    transMap = transHistory.pHistory ? Object.assign({}, transHistory.pHistory[earnedOffer.purchaseType]) : null;
  } else {
    transMap = transHistory.cHistory ? Object.assign({}, transHistory.cHistory[earnedOffer.category]) : null;
  }
  if (!transMap || !transMap.instances || !transMap.instances.length) {
    return count;
  }
  transMap.instances = transMap.instances.filter(i => i && i.date && new Date(i.date) > new Date(noEarlierThan));
  if (!transMap.instances.length) {
    return count;
  }
  let iter = 0;
  switch (userMetric) {
    case metrics.UNIQUE:
      while (count < Number(userQuant) && iter < transMap.instances.length) {
        count += transMap.instances[iter].available["count"];
        iter++;
      }
    case metrics.AMT:
    default:
      while (count < Number(userQuant) && iter < transMap.instances.length) {
        count += transMap.instances[iter].available["amount"];
        iter++;
      }
  }
  return count;
};

const generateAggregateProgressForOffer = (earnedOffer, transHistory) => {
  const {strategy, userMetric, userQuant, recomendeeMetric, recomendeeQuant, method} = earnedOffer;
  const isDefault = !method && userMetric !== OFFER_TYPES.PURCH_TYPES.NUM_OF;
  const byCat = !isDefault && method === "C";
  const byPT = !isDefault && method === "P";
  let sum = 0;
  let tot = 0;
  switch (strategy) {
    case "LOY":
      if (isDefault) {
        sum = compareMetric(userMetric, transHistory);
      } else if (compareMetric(userMetric, transHistory) >= userQuant) {
        if (byCat) {
          sum = compareByType(earnedOffer, transHistory);
        } else if (byPT) {
          sum = compareByType(earnedOffer, transHistory, true);
        }
      }
      tot = userQuant;
      break;
    case "REC":
      sum = compareMetric(recomendeeMetric, transHistory, false);
      tot = recomendeeQuant;
      break;
    default:
      let recSum, userSum = 0;
      if (isDefault) {
        userSum = compareMetric(userMetric, transHistory);
      } else if (compareMetric(userMetric, transHistory) >= userQuant) {
        if (byCat) {
          userSum = compareByType(earnedOffer, transHistory);
        } else if (byPT) {
          userSum = compareByType(earnedOffer, transHistory, true);
        }
      }
      recSum = compareMetric(recomendeeMetric, transHistory, false);
      let aggValue = 0;
      if (userSum >= userQuant) {
        aggValue += 0.5;
      } else {
        aggValue += (userSum/userQuant)/2;
      }
      if (recSum >= recomendeeQuant) {
        aggValue += 0.5;
      } else {
        aggValue += (recSum/recomendeeQuant)/2;
      }
      return parseFloat(aggValue);
  }
  return parseFloat(sum / tot);
};

const compactDataForRedeemOffer = earnedOffer => {
  let formData = {};
  const getMetricFromType = metric => {
    switch (metric) {
      case OFFER_TYPES.PURCH_TYPES.UNIQUE:
        return "Purchases";
      case OFFER_TYPES.PURCH_TYPES.NUM_OF:
        return "Visits";
      case OFFER_TYPES.PURCH_TYPES.AMT:
        return "AmountSpent";
      default:
        break;
    }
  };
  const {strategy, userMetric, userQuant, recomendeeMetric, recomendeeQuant, method, purchaseType, category, onOrAfter} = earnedOffer;

  if (strategy.indexOf("LOY") > -1) {
    formData.user = {
      metric: getMetricFromType(userMetric),
      count: userQuant
    };
    if (method) {
      if (method === 'P' && purchaseType) {
        formData.user.purchaseType = purchaseType;
      } else if (method === 'C' && category) {
        formData.user.category = category;
      }
      if (onOrAfter) {
        formData.user.onOrAfter = onOrAfter;
      }
    }
  }
  if (strategy.indexOf("REC") > -1) {
    formData.rec = {
      metric: getMetricFromType(recomendeeMetric),
      count: recomendeeQuant,
    };
  }
  return formData;
};

/**
 * updatePurchaseHistory
 * 
 * @param {*} subData - subscribedTo data reference (business-specific)
 * @param {*} id - purchaseType OR category id to distinguish by (difference determined by subsequent boolean paramter)
 * @param {*} type - type is equal to 'AmountSpent' from compactDataForRedeemOffer
 * @param {*} quantity - total amount to be used (amount spent or quantity of purchases)
 * @param {*} onOrAfter - date that instances must comply with
 * @param {*} isCategorical - param 'id' is category id
 */
const updatePurchaseHistory = (subData, id, type, quantity, onOrAfter, isCategorical) => {
  let purchaseHistory = subData.purchaseHistory;
  if (!purchaseHistory || !purchaseHistory.length || !quantity) {
    return subData;
  }
  let quant = quantity;
  let isAmountSpent = type === 'AmountSpent';
  let history = purchaseHistory.filter(p => {
    if (isAmountSpent) {
      return p.total && p.total > p.used;
    }
    return p.count && p.count > p.countUsed;
  });
  /*  filter function for purchase instances to ensure instances have not already 
      been used depending on metric and earliest date restriction of earned offer */
  const filterInstances = i => {
    if (onOrAfter && (!i || !i.date || new Date(i.date) < new Date(onOrAfter))) {
      return false;
    }
    if (isAmountSpent) {
      return i.value && i.value > i.usedValue;
    }
    return i.quant && i.quant > i.quantUsed;
  };
  let instances = [];
  if (isCategorical) {
    history.filter(p => p.category.toString() === id).forEach(v => {
      let inst = v ? v.instances.filter(i => filterInstances(i)) : null;
      if (inst) {
        if (!instances || !instances.length) {
          instances = inst;
        } else {
          instances.concat(inst);
        }
      }
    });
    instances.sort(sortByDate);
  } else if (id) {
    instances = _.mapKeys(history, h => h._id)[id].instances.filter(i => filterInstances(i));
  } else {
    history.forEach(v => {
      let inst = v ? v.instances.filter(i => filterInstances(i)) : null;
      if (inst) {
        if (!instances || !instances.length) {
          instances = inst;
        } else {
          instances.concat(inst);
        }
      }
    });
    instances.sort(sortByDate);
  }
  let iter = 0;
  const props = isAmountSpent ? ["value", "usedValue"] : ["quant", "quantUsed"];
  const ptUsedProp = isAmountSpent ? "used" : "countUsed";
  while (quant > 0 && iter < instances.length) {
    let instance = instances[iter];
    const count = instance[props[0]];
    const used = instance[props[1]];
    const available = count - used;
    const moreThanEnough = available > quant;
    const change = moreThanEnough ? quant : available;
    instance[props[1]] += change;
    subData[`availablePurchase${isAmountSpent ? type : "Quantity"}`] -= change;
    _.mapKeys(history, h => h._id)[instance.id][ptUsedProp] += change;
    quant = moreThanEnough ? 0 : (quant - available);
    iter++;
  }
  return subData;
};

/**
 * redeem offer helper for automated redemption
 * @param {*} subscribedTo 
 * @param {*} userBody 
 * @param {*} recBody 
 * @param {*} offId 
 */
const redeemOfferInContext = (subscribedTo, userBody, recBody, offId) => {
  let offFound = false;
  const redeemSpecialOffer = () => {
    let cat = userBody.category || "";
    let pt = userBody.purchaseType || "";
    if (cat || pt) {
      let id = cat || pt;
      subscribedTo = updatePurchaseHistory(subscribedTo, id, userBody.metric, Number(userBody.count), userBody.onOrAfter, !!cat);
    }
  };
  const checkForDefaultPurchaseCreditUsage = () => {
    let diff = subscribedTo[`${userBody.metric.charAt(0).toLowerCase()}${userBody.metric.substring(1)}`].count - subscribedTo[`applied${userBody.metric}`].count;                  
    if (userBody.metric !== "Visits" && diff >= 0) {
      let available = subscribedTo[`availablePurchase${userBody.metric === "AmountSpent" ? userBody.metric : "Quantity"}`];
      let nonPHCredit = diff - available;
      if (nonPHCredit < Number(userBody.count)) {
        subscribedTo = updatePurchaseHistory(subscribedTo, null, userBody.metric, Number(userBody.count) - nonPHCredit);
      }
    }
  };
  if (subscribedTo.usedOffers && subscribedTo.usedOffers.length > 0) {
    _.forEach(subscribedTo.usedOffers, function(off, j) {
      // find used offer for this business and the current offer
      if (off._id.toString() === offId.toString()) {
        subscribedTo.usedOffers[j].usage++;
        if (userBody) {
          checkForDefaultPurchaseCreditUsage();

          subscribedTo[
            `applied${userBody.metric}`
          ].count += Number(userBody.count);
          
          redeemSpecialOffer();
        }
        if (recBody) {
          subscribedTo[
            `applied${recBody.metric}`
          ].recommendeeCount += Number(recBody.count);
        }
        offFound = true;
      }
    });
    if (!offFound) {
      if (userBody) {
        if (!userBody.purchaseType && !userBody.category) {
          checkForDefaultPurchaseCreditUsage();
        }
        subscribedTo[`applied${userBody.metric}`].count += Number(
          userBody.count
        );
        redeemSpecialOffer();
      }
      if (recBody) {
        subscribedTo[
          `applied${recBody.metric}`
        ].recommendeeCount += Number(recBody.count);
      }
      subscribedTo.usedOffers.push({
        _id: new ObjectId(offId),
        usage: 1
      });
    }
  } else {
    /* RARE EDGE CASE -- if offer was notFound and there are NOT ANY used offers, initialize the usedOffer array and add this usedOffer */
    subscribedTo.usedOffers = [];
    subscribedTo.usedOffers.push({
      _id: new ObjectId(offId),
      usage: 1
    });
    if (userBody) {
      checkForDefaultPurchaseCreditUsage();
      subscribedTo[`applied${userBody.metric}`].count += Number(
        userBody.count
      );
      redeemSpecialOffer();
    }
    if (recBody) {
      subscribedTo[
        `applied${recBody.metric}`
      ].recommendeeCount += Number(recBody.count);
    }
  }
  return subscribedTo;
}

/**
 *
 * redeemOffer - if subscribedTo object exists for a given
 * user and business, update, otherwise, add new object with
 * incremented usedOffers counter within usedOffer object
 *
 */
exports.redeemOffer = async (ctx, next) => {
  const { userId, busId, offId } = ctx.params;
  const { body } = ctx.request;

  try {
    const user = await User.findById(userId);
    if (!user) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error:
              "Unable to find corresponding user. Offer redemption not recorded."
          }
        ]
      };
    } else {
      let subscribedTo = [];
      let subFound,
        offFound = false;

      // check if user has subscriptions
      if (user.subscribedTo && user.subscribedTo.length > 0) {
        subscribedTo = user.subscribedTo.slice();
        _.forEach(subscribedTo, function(sub, i) {
          // find subscription for current business
          if (sub._id.toString() === busId) {
            let sub = subscribedTo[i];
            subFound = true;
            // check if has used offers with this business
            if (sub.usedOffers && sub.usedOffers.length > 0) {
              _.forEach(sub.usedOffers, function(off, j) {
                // find used offer for this business and the current offer
                if (off._id.toString() === offId) {
                  subscribedTo[i].usedOffers[j].usage++;
                  if (body.user) {
                    if (!body.user.purchaseType && !body.user.category) {
                      let diff = subscribedTo[i][`${body.user.metric.charAt(0).toLowerCase()}${body.user.metric.substring(1)}`].count - subscribedTo[i][`applied${body.user.metric}`].count;
                      if (body.user.metric !== "Visits" && diff >= 0) {
                        let available = subscribedTo[i][`availablePurchase${body.user.metric === "AmountSpent" ? body.user.metric : "Quantity"}`];
                        let nonPHCredit = diff - available;
                        if (nonPHCredit < Number(body.user.count)) {
                          subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], null, body.user.metric, Number(body.user.count) - nonPHCredit);
                        }
                      }
                    }
                    subscribedTo[i][
                      `applied${body.user.metric}`
                    ].count += Number(body.user.count);
                    let cat = body.user.category || "";
                    let pt = body.user.purchaseType || "";
                    if (cat || pt) {
                      let id = cat || pt;
                      subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], id, body.user.metric, Number(body.user.count), body.user.onOrAfter, !!cat);
                    }
                  }
                  if (body.rec) {
                    subscribedTo[i][
                      `applied${body.rec.metric}`
                    ].recommendeeCount += Number(body.rec.count);
                  }
                  offFound = true;
                }
              });
              // if offer was notFound but there are used offers, add this usedOffer
              if (!offFound) {
                if (body.user) {
                  if (!body.user.purchaseType && !body.user.category) {
                    let diff = subscribedTo[i][`${body.user.metric.charAt(0).toLowerCase()}${body.user.metric.substring(1)}`].count - subscribedTo[i][`applied${body.user.metric}`].count;
                    if (body.user.metric !== "Visits" && diff >= 0) {
                      let available = subscribedTo[i][`availablePurchase${body.user.metric === "AmountSpent" ? body.user.metric : "Quantity"}`];
                      let nonPHCredit = diff - available;
                      if (nonPHCredit < Number(body.user.count)) {
                        subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], null, body.user.metric, Number(body.user.count) - nonPHCredit);
                      }
                    }
                  }
                  subscribedTo[i][
                    `applied${body.user.metric}`
                  ].count += Number(body.user.count);
                  let cat = body.user.category || "";
                  let pt = body.user.purchaseType || "";
                  if (cat || pt) {
                    let id = cat || pt;
                    subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], id, body.user.metric, Number(body.user.count), body.user.onOrAfter, !!cat);
                  }
                }
                if (body.rec) {
                  subscribedTo[i][
                    `applied${body.rec.metric}`
                  ].recommendeeCount += Number(body.rec.count);
                }
                subscribedTo[i].usedOffers.push({
                  _id: new ObjectId(offId),
                  usage: 1
                });
              }
            } else {
              /* RARE EDGE CASE -- if offer was notFound and there are NOT ANY used offers, initialize the usedOffer array and add this usedOffer */
              subscribedTo[i].usedOffers = [];
              subscribedTo[i].usedOffers.push({
                _id: new ObjectId(offId),
                usage: 1
              });
              if (body.user) {
                if (!body.user.purchaseType && !body.user.category) {
                  let diff = subscribedTo[i][`${body.user.metric.charAt(0).toLowerCase()}${body.user.metric.substring(1)}`].count - subscribedTo[i][`applied${body.user.metric}`].count;
                  if (body.user.metric !== "Visits" && diff >= 0) {
                    let available = subscribedTo[i][`availablePurchase${body.user.metric === "AmountSpent" ? body.user.metric : "Quantity"}`];
                    let nonPHCredit = diff - available;
                    if (nonPHCredit < Number(body.user.count)) {
                      subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], null, body.user.metric, Number(body.user.count) - nonPHCredit);
                    }
                  }
                }
                subscribedTo[i][
                  `applied${body.user.metric}`
                ].count += Number(body.user.count);
                let cat = body.user.category || "";
                let pt = body.user.purchaseType || "";
                if (cat || pt) {
                  let id = cat || pt;
                  subscribedTo[i] = updatePurchaseHistory(subscribedTo[i], id, body.user.metric, Number(body.user.count), body.user.onOrAfter, !!cat);
                }
              }
              if (body.rec) {
                subscribedTo[i][
                  `applied${body.rec.metric}`
                ].recommendeeCount += Number(body.rec.count);
              }
            }
          }
        });
        // if subscription to business wasn't found, add subscription with initial
        // usedOffer corresponding to given offer id and usage count of 1
        if (!subFound) {
          await addSub(subscribedTo, busId, userId, offId, user).then(function(
            value
          ) {
            subscribedTo = value;
          });
        }
      } else {
        /* if there are no subscriptions for this user, add the initial subscription with initial usedOffer corresponding to given offer id and usage count of 1 */
        await addSub(subscribedTo, busId, userId, offId, user).then(function(
          value
        ) {
          subscribedTo = value;
        });
      }

      // perform update
      await user.update({ subscribedTo }).then((res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [{ error: err }]
          };
        } else {
          ctx.status = 200;
          ctx.body = {
            message: `You have redeemed the offer`
          };
        }
      });
    }

    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * deleteUser  - Deletes single user
 */
exports.deleteUser = async (ctx, next) => {
  try {
    await User.findOneAndRemove({ _id: ctx.params.id });
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};
