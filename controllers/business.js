const ObjectId = require('mongoose').Types.ObjectId;
const crypto = require("crypto-promise");
const moment = require("moment");
const User = require("../models/user");
const Plug = require("../models/plug");
const Business = require("../models/business");
const businessUtils = require("../utils/business-utils");
const userUtils = require("../utils/user-utils");
const emailUtils = require("../utils/email-utils");
const paypal = require("../config").paypal;
const { ERRORS, OFFER_TYPES } = require("../constants");
const { paramCase } = require("change-case");

const { standardizeBusiness } = businessUtils;
const { standardizeUser } = userUtils;
const { sendEmail } = emailUtils;

/**
 * getUsers  - Returns JSON for all businesses
 * @returns {Array} - Array of Businesses
 */
exports.getBusinesses = async (ctx, next) => {
  try {
    const businesses = await Business.find({});
    const filteredBusinesses = businesses.map(business =>
      standardizeBusiness(business)
    );
    ctx.status = 200;
    ctx.body = {
      businesses: filteredBusinesses
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getAllVerifiedBusinesses = async (ctx, next) => {
  try {
    const businesses = await Business.find({verified: true});
    const filteredBusinesses = businesses.map(business =>
      standardizeBusiness(business)
    );
    ctx.status = 200;
    ctx.body = {
      businesses: filteredBusinesses
    };
  } catch (err) {
    ctx.throw(500, err);
  }
};

/* getSubscribedBusiness - return the businesses for which the user's id is within the subscribed array of ids for a given business */
exports.getSubscribedBusinesses = async (ctx, next) => {
  const { id } = ctx.params;
  try {
    let businesses = await Business.find({ "subscribed._id": id, verified: true }).sort({
      offersLength: -1
    });
    // console.log("Subscribed businesses: ", businesses);
    // console.log(
    //   businesses.map(business => standardizeBusiness(business, true))
    // );
    const filteredBusinesses = businesses
      .map(business => standardizeBusiness(business, true))
      .filter(b => b.offers.length > 0);
    // console.log("Filtered businesses: ", filteredBusinesses);
    ctx.status = 200;
    ctx.body = {
      businesses: filteredBusinesses
    };
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getSubscribedFromBusinessesByUser = async (ctx, next) => {
  try {
    const businesses = await Business.find({ user: ctx.params.id });
    // // console.log("Businesses: ", businesses);
    // // console.log(businesses.length);
    // console.log(businesses);
    const standardize = bus => ({ id: bus._id, subscribed: bus.subscribed, purchaseTypes: bus.purchaseTypes.filter(p => !p.deleted), categories: bus.categories });
    const filteredBusinesses = businesses
      .filter(b => !!b && b.verified && b.subscribed.length > 0)
      .map(b => standardize(b));
    // console.log(filteredBusinesses);
    ctx.status = 200;
    ctx.body = {
      subscribed: filteredBusinesses
    };
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getSubscribedByBusiness = async (ctx, next) => {
  try {
    const business = Business.findById(ctx.params.id);
    ctx.status = 200;
    ctx.body = {
      subscribed: businesses.subscribed
    };
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getInitialBusinesses = async (ctx, next) => {
  const { userId } = ctx.params;
  const initAmt = parseInt(ctx.params.initAmt);

  let otherCount,
    userCount,
    rem = 0;
  let businesses = [];

  try {
    let myBuses = userId ? await Business.find({ user: userId }).sort({
      offersLength: -1
    }) : null;
    let isOwn = myBuses && myBuses.length > 0;
    myBuses = isOwn ? myBuses : [];
    userCount = myBuses.length;
    if (userCount > initAmt) {
      myBuses = myBuses.slice(0, initAmt);
    }
    rem = initAmt >= 10 ? initAmt - userCount : 10 - userCount;

    const otherBuses = await Business.find({
      user: {
        $ne: userId
      },
      verified: true
    })
      .sort({ offersLength: -1 })
      .limit(rem + 1)
      .exec(async function(err, doc) {
        if (err) {
          ctx.throw(500, err);
        } else {
          otherCount = await doc.length;
        }
      });
    const removeExpired = bus => {};
    let others = otherBuses.slice(0, rem);
    if (myBuses && myBuses.length) {
      myBuses = myBuses.map(b => standardizeBusiness(b, false)); // keep expired offers for editing
    }
    others = others.map(b => standardizeBusiness(b, true)); // remove expired offers for interaction
    businesses =
      myBuses.length > 0 ? [...myBuses].concat([...others]) : others.slice();
    // // console.log(otherCount > rem); // console.log(otherCount); // console.log(rem);
    ctx.status = 200;
    ctx.body = {
      businesses,
      more: otherCount > rem,
      myLast: myBuses ? myBuses.length : null
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.getMoreBusinesses = async (ctx, next) => {
  let num = parseInt(ctx.params.num);
  let skip = parseInt(ctx.params.skip);
  let userId = ctx.params.userId;

  let businesses = [];
  let count = 0;

  try {
    const buses = userId ? await Business.find({
      user: {
        $ne: userId
      },
      verified: true
    })
      .sort({ offersLength: -1 })
      .skip(skip)
      .limit(num + 1)
      .exec(async function(err, doc) {
        if (err) {
          ctx.throw(500, err);
        } else {
          count = await doc.length;
        }
      }) : await Business.find({verified: true})
        .sort({ offersLength: -1 })
        .skip(skip)
        .limit(num + 1)
        .exec(async function(err, doc) {
          if (err) {
            ctx.throw(500, err);
          } else {
            count = await doc.length;
          }
        });
    businesses = buses.slice(0, num);
    const filteredBusinesses = businesses.map(business =>
      standardizeBusiness(business)
    );
    ctx.status = 200;
    ctx.body = {
      businesses: filteredBusinesses,
      more: count > num
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * getBusinessesByUser  - Returns JSON for all users
 * @returns {Array} - Array of Businesses
 */
exports.getBusinessesByUser = async (ctx, next) => {
  try {
    const businesses = await Business.find({ user: ctx.params.userId });
    const filteredBusinesses = businesses.map(business =>
      standardizeBusiness(business)
    );
    ctx.status = 200;
    ctx.body = {
      businesses: filteredBusinesses
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.verifyBusiness = async (ctx, next) => {
  const { verifyToken, userId } = ctx.params;
  // console.log(userId);
  try {
    await Business.findOneAndUpdate(
      {
        verifyAccountToken: verifyToken,
        verifyAccountExpires: {
          $gt: Date.now()
        }
      },
      {
        verified: true,
        verifyAccountToken: undefined,
        verifyAccountExpires: undefined
      },
      { new: true }
    ).then(async (res, err) => {
      if (err) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: ERRORS.VERIFY_BUSINESS_EXPIRED
            }
          ]
        };
      } else if (res) {
        await User.findOneAndUpdate({ _id: userId, "vendorAccounts._id": res._id } , {
          $set: {
            "vendorAccounts.$.verified": true
          },
          $push: {
            notifications: {
              $each: [
                {
                  description: `${(res && res.name) ||
                    "Your business"} has been verified. Congratulations!`
                }
              ],
              $position: 0
            }
          }
        }).then(function(result, error) {
          ctx.status = 200;
          ctx.body = {
            message: "Your business has been verified."
          };
        });
      }
    });
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.editOffer = async (ctx, next) => {
  try {
    const { busId, id } = ctx.params;

    const {
      title,
      description,
      expDate,
      maxUsageCount,
      offerType,
      earnedOffer,
      vendorActionRequired
    } = ctx.request.body;

    // check for required fields
    if (title && description && maxUsageCount && offerType) {

      if (offerType === OFFER_TYPES.EARNED && !earnedOffer) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error:
                "Insufficient offer information provided. Unable to add offer"
            }
          ]
        };
        await next();
      }

      if (earnedOffer) {
        Object.keys(earnedOffer).forEach(key => {
          if (earnedOffer[key] === null) {
            delete earnedOffer[key];
          }
        });
      }

      let offer = {
        _id: new ObjectId(id),
        title,
        description,
        expDate: expDate || null,
        maxUsageCount,
        vendorActionRequired: vendorActionRequired || false,
        offerType,
        earnedOffer: earnedOffer || null
      };

      const business = await Business.findOneAndUpdate(
        {
          _id: busId,
          "offers._id": id
        },
        {
          $set: {
            "offers.$": offer
          }
        }
      );

      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: "No corresponding business found. Unable to update offer."
            }
          ]
        };
        await next();
      }

      ctx.body = {
        message: `This offer was successfully updated for ${business.name}.`
      };
      ctx.status = 200;
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "Insufficient information. Unable to update offer."
          }
        ]
      };
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.addPurchaseType = async (ctx, next) => {
  const { id } = ctx.params;
  const { description, category, amountSpent } = ctx.request.body;
  console.log(category);
  let purchaseType = {
    description: description.trim(),
    amountSpent: (amountSpent ? Number(amountSpent) : 0)
  };
  try {
    if (category && typeof category !== "undefined" && category.length) {
      let categoryOId = category.length === 24 ? new ObjectId(category) : "";
      let newCategory = "";
      let business = await Business.findById(id);
      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            { error: "Categories could not be updated because the business could not be found." }
          ]
        }
        return next();
      }
      if (business && (!categoryOId || (categoryOId && categoryOId.toString() !== category))) {
        if (!business.categories || typeof business.categories === 'undefined') {
          business.categories = [];
        }
        let name = category.trim();
        let cats = business.categories.length ? business.categories.map(c => c.name.toLowerCase()) : null;
        let found = cats ? cats.indexOf(name.toLowerCase()) : -1;
        if (found > -1) {
          newCategory = business.categories[found]._id;
        } else {
          business.categories.push({ name });
          await business.save().then((res, err) => {
            if (err) {
              ctx.status = 422;
              ctx.body = {
                errors: [{
                  error: "Categories could not be updated. Unable to associate purchase type with new category."
                }]
              }
              return next();
            } else {
              newCategory = res.categories[res.categories.length - 1]._id;
            }
          });
        }
      } else {
        newCategory = categoryOId;
      }
      purchaseType.category = newCategory;
    }
    await Business.findByIdAndUpdate(id, {
      $push: {
        purchaseTypes: purchaseType
      }
    }, {new: true}).then((res, err) => {
      if (err) {
        ctx.status = 422;
        ctx.body = {
          errors: [{
            error: "This purchase type could not be created due to the following reasons:\n" + err
          }]
        }
      } else {
        ctx.status = 200;
        ctx.body = {
          message: 'This purchase type was successfully added',
          purchaseTypes: res.purchaseTypes.filter(p => !p.deleted),
          categories: res.categories
        }
      }
    });
    await next();
  } catch(err) {  
    ctx.throw(500, err);
  }
};

exports.updatePurchaseType = async (ctx, next) => {
  const { id, typeId } = ctx.params;
  const { description, category, amountSpent } = ctx.request.body;
  let purchaseType = {
    description: description.trim(),
    amountSpent: (amountSpent ? Number(amountSpent) : 0)
  };
  try {
    if (category && typeof category !== "undefined" && category.length) {
      let business = await Business.findById(id);
      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            { error: "Categories could not be updated because the business could not be found." }
          ]
        }
        return next();
      }
      let categoryOId = category.length === 24 ? new ObjectId(category) : "";
      let newCategory = "";
      if (business && (!categoryOId || (categoryOId && categoryOId.toString() !== category))) {
        if (!business.categories || typeof business.categories === 'undefined') {
          business.categories = [];
        }
        let name = category.trim();
        let cats = business.categories.length ? business.categories.map(c => c.name.toLowerCase()) : null;
        let found = cats ? cats.indexOf(name.toLowerCase()) : -1;
        if (found > -1) {
          newCategory = business.categories[found]._id;
        } else {
          business.categories.push({ name });
          await business.save().then((res, err) => {
            if (err) {
              ctx.status = 422;
              ctx.body = {
                errors: [{
                  error: "Categories could not be updated. Unable to associate purchase type with new category."
                }]
              }
              return next();
            } else {
              newCategory = res.categories[res.categories.length - 1]._id;
            }
          });
        }
      } else {
        newCategory = categoryOId;
      }
      purchaseType.category = newCategory;
    }
    await Business.findOneAndUpdate({
      _id: id,
      "purchaseTypes._id": typeId
    }, {
      $set: {
        "purchaseTypes.$": purchaseType
      }
    }, {new: true}).then((res, err) => {
      if (err) {
        ctx.status = 422;
        ctx.body = {
          errors: [{
            error: "This purchase type could not be updated due to the following reasons:\n" + err
          }]
        }
      } else {
        ctx.status = 200;
        ctx.body = {
          message: 'This purchase type was successfully updated',
          purchaseTypes: res.purchaseTypes.filter(p => !p.deleted),
          categories: res.categories
        }
      }
    });
    await next();
  } catch(err) {  
    ctx.throw(500, err);
  }
};

exports.deletePurchaseType = async (ctx, next) => {
  const { id, typeId } = ctx.params;
  try {
    await Business.findOneAndUpdate({_id: id, "purchaseTypes._id": typeId}, {
      $set: {
        "purchaseTypes.$.deleted": true
      }
    }, {new: true}).then((res, err) => {
      if (err) {
        ctx.status = 422;
        ctx.body = {
          errors: [{
            error: "This purchase type could not be removed due to the following reasons:\n" + err
          }]
        }
      } else {
        ctx.status = 200;
        ctx.body = {
          message: 'This purchase type was successfully removed',
          purchaseTypes: standardizeBusiness(res).purchaseTypes
        }
      }
    });
    await next();
  } catch(err) {  
    ctx.throw(500, err);
  }
};

/**
 * deleteOffer - find business by business id and offer id and decrement offersLength and set the specified offer to 'deleted: true'
 */
exports.deleteOffer = async (ctx, next) => {
  const { busId, id } = ctx.params;

  try {
    await Business.findOneAndUpdate(
      {
        _id: busId,
        "offers._id": id
      },
      {
        $inc: {
          offersLength: -1
        },
        $set: {
          "offers.$.deleted": true
        }
      },
      {
        new: true
      },
      (err, res) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error:
                  "Unable to delete offer. Business or offer could not be found."
              }
            ]
          };
        }
      }
    );
    ctx.status = 200;
    ctx.body = {
      message: `You have has successfully removed
      this offer.`
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.addOffer = async (ctx, next) => {
  try {
    const {
      title,
      description,
      expDate,
      maxUsageCount,
      vendorActionRequired,
      offerType,
      earnedOffer
    } = ctx.request.body;

    // check for required fields
    if (title && description && maxUsageCount && offerType) {
      if (offerType === OFFER_TYPES.EARNED && !earnedOffer) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error:
                "Insufficient offer information provided. Unable to add offer"
            }
          ]
        };
        await next();
      }

      const business = await Business.findById(ctx.params.id);

      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: "No corresponding business found. Unable to add offer"
            }
          ]
        };
        await next();
      }

      let offers = [];

      if (business.offers) {
        offers = business.offers.slice();
      }

      if (earnedOffer) {
        Object.keys(earnedOffer).forEach(key => {
          if (earnedOffer[key] === null) {
            delete earnedOffer[key];
          }
        });
      }

      offers.push({
        title,
        description,
        expDate: expDate || null,
        maxUsageCount,
        vendorActionRequired: vendorActionRequired || false,
        offerType,
        earnedOffer: earnedOffer || null
      });

      await business.update({
        offers,
        $inc: {
          offersLength: 1
        }
      });

      // console.log("Business: \n", business);

      ctx.body = {
        message: `This offer was successfully added to ${business.name}.`
      };
      ctx.status = 200;
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "Insufficient information. Unable to add offer"
          }
        ]
      };
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.addBusiness = async (ctx, next) => {
  try {
    const user = await User.findById(ctx.params.id);

    if (user.vendorAccounts.length >= 10) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.TOO_MANY_BUSINESSES
          }
        ]
      };
    } else {
      const {
        name,
        category,
        subcategory,
        links,
        description,
        email,
        primaryColor,
        secondaryColor
      } = ctx.request.body;

      if (name && email && category && subcategory && links && user) {
        let business = await Business.findOne({
          name,
          category,
          subcategory,
          email
        });
        if (business != null) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: ERRORS.ALREADY_REGISTERED_BUSINESS
              }
            ]
          };
        } else {
          let subscribed = [{
             _id: new ObjectId(user._id),
             name: user.fullName,
             email: user.email
          }];
          business = new Business({
            user: user._id,
            name,
            email,
            category,
            subcategory,
            links,
            subscribed,
            description: description || "",
            primaryColor: primaryColor || null,
            secondaryColor: secondaryColor || null
          });

          await business.save().then(async (savedBusiness) => {
            if (savedBusiness) {
              let plug = new Plug({
                orig: new ObjectId(savedBusiness.user),
                business: new ObjectId(savedBusiness._id)
              });
              await plug.save().then(async plugObj => {
                if (plug) {
                  user.subscribedTo.push({
                    _id: new ObjectId(savedBusiness._id),
                    plugger: new ObjectId(user._id),
                    plugged: `${ctx.request.header.origin}/plug/${paramCase(savedBusiness.name)}/${plugObj.id}`
                  });
                }
                user.vendorAccounts.push({
                  _id: new ObjectId(savedBusiness._id),
                  name: savedBusiness.name
                });
  
                user.notifications.unshift({
                  description: `Business registration pending for ${
                    business.name
                  }. We sent an email to ${email} containing verification instructions. Your business can also be verified by clicking "Verify your business" under "${business.name}" in the dashboard view.`
                });
  
                const savedUser = await user.save();
  
                const message = {
                  subject: `Thanks for registering ${business.name}`,
                  html: `<p>${
                    savedUser.name.first
                  },<br/></br>You are receiving this because you have registered your business with Plugwin and need to become a paid subscriber in order to make ${business.name} visible to your customers.<br/></br>Visit <a href=${`${ctx.request.header.origin}/dashboard`}>your dashboard</a> to verify your business and let customers see ${business.name}</a><br/></br>If you did not register this business, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
                };
                // // console.log('email will send to', email, 'in regards to', message.subject);
                await sendEmail(email, message).then(() => {
                  ctx.body = {
                    message: `Business registration notice sent`,
                    business: {
                      id: savedBusiness._id,
                      name: savedBusiness.name,
                      email: savedBusiness.email.toLowerCase()
                    }
                  };
                });
              });
            } else {
              ctx.status = 422;
              ctx.body = {
                errors: [
                  {
                    error: `No business found:
              Unable to send verification email. Your business cannot be verified unless you contact info@plugwin.com`
                  }
                ]
              };
            }
          });
        }
      } else {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: ERRORS.INVALID_BUSINESS
            }
          ]
        };
      }
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * Resend account verification link via email and notify user
 * @param {*} ctx
 * @param {*} next
 */
exports.resendVerification = async (ctx, next) => {
  const { id } = ctx.params;
  const { email } = ctx.request.body;
  try {
    const res = await Business.findById(id);
    if (res) {
      const message = {
        subject: `Verify ${res.name} on Plugwin`,
        html: `<p>Representative of ${
          res.name
        },<br/></br>You are receiving this because you have registered your business with Plugwin and need to become a paid subscriber in order to make ${res.name} visible to your customers.<br/></br>Visit <a href=${`${ctx.request.header.origin}/dashboard`}>your dashboard</a> to verify your business and let customers see ${res.name}</a><br/></br>If you did not register this business, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
      };
      await sendEmail(res.email, message).then(async () => {
        await User.findByIdAndUpdate(
          res.user,
          {
            $push: {
              notifications: {
                $each: [
                  {
                    description: `Business verification pending for ${
                      res.name
                    }. We sent an email to ${res.email} containing verification instructions. Your business can also be verified by clicking "Verify your business" under "${res.name}" in the dashboard view.`
                  }
                ],
                $position: 0
              }
            }
          },
          { new: true }
        ).then((result, error) => {
          if (error) {
            ctx.status = 422;
            ctx.body = {
              errors: [{ error: error.toString() }]
            };
          } else if (result) {
            ctx.status = 200;
            ctx.body = {
              notifications: result.notifications
            };
          }
        });
      });
    }
  } catch (err) {
    ctx.throw(500, err);
  }
};

// const transferOwnership = async () => {}

/**
 * updateBusiness - Edits single business
 */
exports.updateBusiness = async (ctx, next) => {
  const {
    name,
    email,
    category,
    subcategory,
    links,
    description,
    primaryColor,
    secondaryColor
  } = ctx.request.body;
  const {id, user} = ctx.params;
  try {
    if (name && email && category && subcategory && links) {
      let business = await Business.findOne({"_id": id, "user": user});
      if (!business) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: "Unable to find business associated with your user account"
            }
          ]
        };
      }
      if (business.name !== name) {
        await User.findOneAndUpdate(
          {
            _id: business.user,
            "vendorAccounts._id": id
          },
          {
            $set: {
              "vendorAccounts.$.name": name
            }
          },
          function(err, result) {
            // console.log(result);
            if (err) {
              ctx.body = {
                errors: [
                  {
                    error:
                      "Unable to update vendor accounts reference. Please try again."
                  }
                ]
              };
            }
          }
        );
      }
      await Business.findByIdAndUpdate(id,
        {
          name,
          email,
          category,
          subcategory,
          links,
          description,
          primaryColor,
          secondaryColor
        }, {new: true}
      ).then((res, err) => {
        ctx.status = 200;
        ctx.body = {
          message: `${name} has been successfully updated!`,
          business: standardizeBusiness(res)
        };
      });
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.INVALID_BUSINESS
          }
        ]
      };
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * getUser  - Returns JSON for specified business
 * @returns {Object}  - Single business object
 */
exports.getBusinessById = async (ctx, next) => {
  try {
    const business = await Business.findById(ctx.params.id);
    ctx.status = 200;
    ctx.body = {
      business: standardizeBusiness(business)
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * getUser  - Returns JSON for specified business by name
 * @returns {Object}  - Single business object
 */
exports.getBusinessByName = async (ctx, next) => {
  try {
    const business = await Business.findById(ctx.params.name);
    ctx.status = 200;
    ctx.body = {
      business: standardizeBusiness(business)
    };
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.prepareBusinessDelete = async (ctx, next) => {
  try {
    const { id } = ctx.params;
    const buffer = await crypto.randomBytes(24);
    const deleteToken = buffer.toString("hex");
    let name,
      email = null;

    let business = await Business.findByIdAndUpdate(id, {
      deleteAccountToken: deleteToken,
      deleteAccountExpires: moment().add(30, "day")
    });

    if (!business) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: `No business found:
        Unable to send remove business email. Your business cannot be deleted unless you contact info@plugwin.com`
          }
        ]
      };
    } else {
      name = business.name;
      email = business.email;
      let userName = "";
      await User.findByIdAndUpdate(business.user, {
        $push: {
          notifications: {
            $each: [
              {
                description: `Business deletion pending for ${name}. We sent an email to ${email} containing a removal confirmation link (it will expire in 30 days).
                Please confirm in order to complete the business removal process.`
              }
            ],
            $position: 0
          }
        }
      }).then(async (res, err) => {
        if (err) {
          // console.log(
          //   "Error notifying user of preparing to delete business: ",
          //   err
          // );
        } else if (res) {
          userName = res.fullName || `${res.name.first} ${res.name.last}`;
          if (name && email) {
            const message = {
              subject: `Confirm Removal of ${name}`,
              html: `<p>${userName ||
                `Representative of ${name}`},<br/></br>You are receiving this because you have expressed a desire to remove your business with Plugwin and need to confirm this action. We are sad to see you go, but still wish you the best in your business endeavors.<br/></br><a href=${`${
                ctx.request.header.origin
              }/delete-business/${deleteToken}`}>Click here to remove your business</a><br/></br>If you did not initiate this action, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
            };

            await sendEmail(email, message).then(() => {
              ctx.body = {
                message: `Business deletion pending for ${name}. We sent an email to ${email} containing a removal confirmation link (it will expire in 30 days).
                  Please confirm in order to complete the business removal process.`
              };
            });
          }
        }
      });
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.autoVerifyBusiness = async (ctx, next) => {
  const { id, requester } = ctx.params;
  try {
    const requestUser = await User.findById(requester);
    
    if (requestUser.role === 'admin') {
      await Business.findByIdAndUpdate(id, {
        verified: true
      }).then(async(res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [{
              error: "The business could not be verified due to the following reason: \n" + err
            }]
          };
        } else if (res) {
          await User.findOneAndUpdate({ _id: res.user, "vendorAccounts._id": res._id } , {
            $set: {
              "vendorAccounts.$.verified": true
            },
            $push: {
              notifications: {
                $each: [
                  {
                    description: `${(res && res.name) ||
                      "Your business"} has been verified. Congratulations!`
                  }
                ],
                $position: 0
              }
            }
          }).then((result, error) => {
            if (error) {
              ctx.status = 422;
              ctx.body = {
                errors: [{
                  error: "The business could not be verified due to the following reason: \n" + error
                }]
              };
            } else {
              ctx.status = 200;
              ctx.body = {
                message: `${res.name} has successfully been verified on Plugwin`
              };
            }
          });
        }
      });
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.autoUnverifyBusiness = async (ctx, next) => {
  const { id, requester } = ctx.params;
  try {
    const requestUser = await User.findById(requester);
    
    if (requestUser.role === 'admin') {
      await Business.findByIdAndUpdate(id, {
        verified: false
      }).then(async (res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [{
              error: "The business could not be unverified due to the following reason: \n" + err
            }]
          }
        } else {
          await User.findOneAndUpdate({
            _id: res.user,
            "vendorAccounts._id": res._id
          }, {
            $set: {
              "vendorAccounts.$.verified" : false
            }
          }).then((result, error) => {
              ctx.status = 200;
              ctx.body = {
                message: `${res.name} has successfully been unverified on Plugwin`
              };
          })
          
        }
      });
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

exports.adminDeleteBusiness = async (ctx, next) => {
  const { id, requester } = ctx.params;
  try {
    const requestUser = await User.findById(requester);
    
    if (requestUser.role === 'admin') {
      let business = await Business.findById(id);
      if (business) {
        await business.remove();
        await User.findByIdAndUpdate(business.user, {
          $pull: {
            vendorAccounts: {
              _id: id
            }
          }
        }).then(async (res, err) => {
          if (err) {
            ctx.status = 422;
            ctx.body = {
              errors: [
                { error: "Could not update the business user's account due to the following: \n" + err }
              ]
            }
          } else {
            await User.update({ "subscribedTo._id": business._id }, { multi: true }, function(error, result) {
              if (error) {
                ctx.status = 422;
                ctx.body = {
                  errors: [{
                    error: "The business could not be dereferenced across Plugwin due to the following reason: \n" + error
                  }]
                }
              } else {
                ctx.status = 200;
                ctx.body = {
                  message: `${business.name} has successfully been removed and its references removed across Plugwin`
                }
              }
            });
          }
        });
      }
    }
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
}

/**
 * deleteBusiness  - Deletes single business and references user vendor accounts object
 */
exports.deleteBusiness = async (ctx, next) => {
  try {
    const { deleteToken, userId } = ctx.params;
    let busId = null;

    let business = await Business.findOne(
      {
        user: userId,
        deleteAccountToken: deleteToken,
        deleteAccountExpires: {
          $gt: Date.now()
        }
      },
      function(err, doc) {
        if (err) {
          // console.log(err);
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: ERRORS.DELETE_BUSINESS_EXPIRED
              }
            ]
          };
          next();
        }
      }
    );

    if (!business) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.DELETE_BUSINESS_EXPIRED
          }
        ]
      };
    } else {
      busId = business._id;
      await business.remove();
    }

    if (busId) {
      await User.update(
        {
          _id: userId
        },
        {
          $push: {
            notifications: {
              $each: [
                {
                  description: `You have removed ${
                    business.name
                  }. It's unfortunate, but we probably don't understand the circumstances, so we won't judge.`
                }
              ],
              $position: 0
            }
          },
          $pull: {
            vendorAccounts: {
              _id: busId
            }
          }
        }
      ).exec(function(err, res) {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: "No corresponding user found. Unable to delete business."
              }
            ]
          };
        } else {
          ctx.status = 200;
          ctx.body = {
            message: "Your business has been removed."
          };
        }
      });
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "No corresponding user found. Unable to delete business."
          }
        ]
      };
    }

    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};
