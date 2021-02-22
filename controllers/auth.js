const crypto = require("crypto-promise");
const moment = require("moment");
const _ = require("lodash");
const passport = require("../config").passport;
const User = require("../models/user");
const Business = require("../models/business");
const userUtils = require("../utils/user-utils");
const emailUtils = require("../utils/email-utils");
const validationUtils = require("../utils/validation-utils");
const {ROLES, ERRORS} = require("../constants");

const {standardizeUser, standardizeUserToken, generateJWT, getRole, cleanName} = userUtils;
const {sendEmail} = emailUtils;
const {responseValidator} = validationUtils;

/**
 * createTokenCtx  - Creates JWT info for ctx.body
 * @param {Object} user User object to convert to generate JWT with
 */
const createTokenCtx = user => {
  const tokenData = generateJWT(user);

  return {token: `JWT ${tokenData.token}`, tokenExpiration: tokenData.expiration, user: standardizeUserToken(user)};
};

/**
 * jwtAuth  - Attempts to authenticate a user via a JWT in the Authorization
 *            header.
 */
exports.jwtAuth = (ctx, next) => passport.authenticate("jwt", async(err, payload) => {
  const epochTimestamp = Math.round(new Date().getTime() / 1000);
  // If there is no payload, inform the user they are not authorized to see the
  // content
  if (!payload) {
    ctx.status = 401;
    ctx.body = {
      errors: {
        error: ERRORS.JWT_FAILURE
      },
      jwtExpired: true
    };
    // Check if JWT has expired, return error if so
  } else if (payload.exp <= epochTimestamp) {
    ctx.status = 401;
    ctx.body = {
      errors: {
        error: ERRORS.JWT_EXPIRED
      },
      jwtExpired: true
    };
  } else {
    // Add user to state
    ctx.state.user = payload;
    await next();
  }
})(ctx, next);

/**
 * localAuth  - Attempts to login a user with an email address and password
 *              using PassportJS (http://passportjs.org/docs)
 */
exports.login = (ctx, next) => passport.authenticate("local", async(err, user) => {
  if (!user || !Object.keys(user).length) {
    ctx.status = 401;
    ctx.body = {
      errors: [
        {
          error: ERRORS.BAD_LOGIN
        }
      ]
    };
    await next();
  } else {
    ctx.status = 200;
    ctx.body = Object.assign(ctx.body || {}, createTokenCtx(user));
    await next();
  }
})(ctx, next);

/**
 * googleLogin - Use googleToken passport method for authentication
 * @param {*} ctx 
 * @param {*} next 
 */
exports.googleLogin = (ctx, next) => {
  return passport.authenticate("googleToken", async(err, user) => {
    if (!user || !Object.keys(user).length) {
      ctx.status = 401;
      ctx.body = {
        errors: [
          {
            error: ERRORS.BAD_LOGIN
          }
        ]
      };
      await next();
    } else {
      ctx.status = 200;
      ctx.body = Object.assign(ctx.body || {}, createTokenCtx(user));
      await next();
    }
  })(ctx, next);
};

/**
 * googleLogin - Use googleToken passport method for authentication
 * @param {*} ctx 
 * @param {*} next 
 */
exports.facebookLogin = (ctx, next) => {
  return passport.authenticate("facebookToken", async(err, user) => {
    if (!user || !Object.keys(user).length) {
      ctx.status = 401;
      ctx.body = {
        errors: [
          {
            error: ERRORS.BAD_LOGIN
          }
        ]
      };
      await next();
    } else {
      ctx.status = 200;
      ctx.body = Object.assign(ctx.body || {}, createTokenCtx(user));
      await next();
    }
  })(ctx, next);
};

const adminEmails = [
  "billing@plugwin.com",
  "plugwin.dev@gmail.com",
  "cmgreenmachine@gmail.com"
];

/**
 * register - Attempts to register a new user, if a user with that email
 *            address does not already exist.
 */
exports.register = async(ctx, next) => {
  // Check for registration errors

  const validation = responseValidator(ctx.request.body, [
    {
      name: "email",
      required: true
    }, {
      name: "name",
      required: true
    }, {
      name: "password",
      required: true
    }, {
      name: "passwordConfirm",
      required: true
    }
  ]);

  if (validation && validation.length && validation[0].error) {
    ctx.status = 422;
    ctx.body = {
      errors: validation
    };
    await next();
  }

  const {email, password, name} = validation;

  if (email && password && name) {
    const formattedEmail = email.toLowerCase();
    try {
      let user = await User.findOne({email: formattedEmail});

      if (user !== null) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: ERRORS.ALREADY_REGISTERED
            }
          ]
        };
      } else {
        const buffer = await crypto.randomBytes(24);
        const verifyToken = buffer.toString("hex");
        let adminEmail = adminEmails.filter(e => e === email.toLowerCase().trim());
        let isAdminEmail = adminEmail && adminEmail.length === 1;
        let notifications = !isAdminEmail ? [
          {
            description: `We sent an email to ${email.toLowerCase()} containing an account verification link (it will expire in 30 days). Please confirm in order to use Plugwin as a verified user. Otherwise, you will only have access to some features as a guest.`
          }
        ] : null;
        let formmatedName = cleanName(name);
        
        user = new User({
          name: formmatedName,
          method: 'local',
          role: isAdminEmail ? 'admin' : 'guest',
          password,
          email: email.toLowerCase(),
          notifications,
          verifyAccountToken: verifyToken,
          verifyAccountExpires: moment().add(30, "day")
        });
        const savedUser = await user.save();
        
        if (savedUser) {
          if (!isAdminEmail) {
            const message = {
              subject: "Welcome to Plugwin!",
              html: `<p>${name.first},<br/></br>You are receiving this because you (or someone or your behalf) has requested to be a user of Plugwin.<br/></br><a href=${ `${ctx.request.header.origin}/verify-account/${verifyToken}`}>Click here to verify your account</a><br/></br>If you did not sign up, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
            };
  
            await sendEmail(email, message).then(() => {
              ctx.body = Object.assign(ctx.body || {}, createTokenCtx(savedUser));
            });
          } else {
            ctx.body = Object.assign(ctx.body || {}, createTokenCtx(savedUser));
          }
        } else {
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: "User could not be registered"
              }
            ]
          };
        }
      }
      await next();
    } catch (err) {
      ctx.throw(500, err);
    }
  }
};

/**
 * Resend account verification link via email and notify user
 * @param {*} ctx
 * @param {*} next
 */
exports.resendAccountVerification = async(ctx, next) => {
  const {id} = ctx.params;
  const {email} = ctx.request.body;
  try {
    const buffer = await crypto.randomBytes(24);
    const verifyToken = buffer.toString("hex");
    await User.findByIdAndUpdate(id, {
      verifyAccountToken: verifyToken,
      verifyAccountExpires: moment().add(30, "day"),
      $push: {
        notifications: {
          $each: [
            {
              description: `We sent an email to ${email.toLowerCase()} containing an account verification link (it will expire in 30 days). Please confirm in order to use Plugwin as a verified user. Otherwise, you will only have access to some features as a guest.`
            }
          ],
          $position: 0
        }
      }
    }, {new: true}).then(async(res, err) => {
      if (err) {
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: "User account could not be updated for verification."
            }
          ]
        };
      } else {
        if (res) {
          const message = {
            subject: "Verify Your Account",
            html: `<p>${res.name.first},<br/></br>You are receiving this because you (or someone or your behalf) has requested to be a verified user of Plugwin.<br/></br><a href=${ `${ctx.request.header.origin}/verify-account/${verifyToken}`}>Click here to verify your account</a><br/></br>If you did not request this, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
          };
          await sendEmail(res.email, message).then(() => {
            ctx.status = 200;
            ctx.body = {
              notifications: res.notifications
            };
          });
        }
      }
    });
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * verifyAccount  - Allows user with token from email to confirm their account and secure user privileges
 */
exports.verifyAccount = async(ctx, next) => {
  const {verifyToken, id} = ctx.params;
  try {
    const user = await User.findOneAndUpdate({
      _id: id,
      verifyAccountToken: verifyToken,
      verifyAccountExpires: {
        $gt: Date.now()
      }
    }, {
      $push: {
        notifications: {
          $each: [
            {
              description: "Your account has been fully authenticated. You can now use all that Plugwin has " +
                "to offer!"
            }
          ],
          $position: 0
        }
      },
      role: ROLES.USER,
      verifyAccountToken: undefined,
      verifyAccountExpires: undefined
    }, {new: true}).then((res, err) => {
      if (err) {
        // If no user was found, their reset request likely expired. Tell them that.
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: ERRORS.VERIFY_ACCOUNT_EXPIRED
            }
          ]
        };
      } else {
        ctx.status = 200;
        ctx.body = {
          message: "Account was verified",
          notifications: res.notifications
        };
      }
    });

    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * forgotPassword - Allows a user to request a password reset, but does not
 *                  actually reset a password. Sends link in email for security.
 */
exports.forgotPassword = async(ctx, next) => {
  const {email} = ctx.request.body;
  const isSocial = typeof ctx.request.body.isSocial !== "undefined" ? ctx.request.body.isSocial : false;
  try {
    const buffer = await crypto.randomBytes(24);
    const resetToken = buffer.toString("hex");
    const user = await User.findOneAndUpdate({
      email
    }, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: moment().add(1, "hour")
    });

    // If a user was actually updated, send an email
    if (user) {
      const message = {
        subject: isSocial ? "Complete Your Own Login" : "Reset Password",
        html: `<p>${user.name.first},<br/></br>You are receiving this because you have (or someone else has) requested ${isSocial ? "to create a manual login (just through Google or Facebook)" : "the reset of the password"} for your account.<br/></br><a href=${ `${ctx.request.header.origin}/reset-password/${resetToken}${isSocial ? '/already-social' : ""}`}>Click here</a> to ${isSocial ? "complete your custom sign-in." : "reset your password."}<br/></br>If you did not request this, please contact us at <a href="mailto:info@plugwin.com">info@plugwin.com</a> to report fraudulence.</p>`
      };

      await sendEmail(email, message);
      ctx.status = 200;
      ctx.body = {
        message: `We sent an email to ${email} containing a password reset link. It will expire in one hour.`
      };
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "Could not find reference to user."
          }
        ]
      };
    }

    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

const getBusinessUpdatePromise = (id, user) => {
  return new Promise((resolve, reject) => {
    Business.findOneAndUpdate({"_id": id, "subscribed._id": user._id}, {
      $set: {
        "subscribed.$.name": user.fullName
      }
    }, {new: true}, function (err, doc, res) {
      if (err) {
        reject(new Error(`${doc.name} could not be updated with user's new information`));
      } else {
        resolve(_.mapKeys(doc.subscribed, s => s._id)[user._id].name);
      }
    });
  });
};

exports.updateAccount = async(ctx, next) => {
  const {password, passwordConfirm, name} = ctx.request.body;
  const {resetToken} = ctx.params;
  console.log(resetToken, password, passwordConfirm);
  const isName = name && typeof name !== 'undefined' && name.first && name.last;
  let validateArr = [
    {
      name: "password",
      required: true
    }, {
      name: "passwordConfirm",
      required: true
    }
  ];
  if (isName) {
    validateArr.unshift({
        name: "name",
        required: true
    });
  }
  const validation = responseValidator(ctx.request.body, validateArr);
  if (validation && validation.length && validation[0].error) {
    ctx.status = 422;
    ctx.body = {
      errors: validation
    };
    await next();
  } else {
    try {
      const user = await User.findOne({
        resetPasswordToken: resetToken,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      });
      if (user) {
        const isSame = await user.comparePassword(password);
        if (isSame) {
          // If the password is the same as the previous one, notify the user.
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: ERRORS.SAME_AS_OLD_PASSWORD
              }
            ]
          };
        } else {
          const newHashedPassword = await user.hashPassword(password);
          let updateObj = {
            password: newHashedPassword, 
            resetPasswordToken: undefined, 
            resetPasswordExpires: undefined,
            method: 'local'
          };
          if (user.email.toLowerCase() === "plugwin.dev@gmail.com") {
            updateObj.role = "admin";
          }
          if (isName) {
            let formattedName = cleanName(name);
            updateObj.unshift({
              name: formattedName
            });
          }
          await User.findByIdAndUpdate(user._id, updateObj).then(async(res, err) => {
            if (err) {
              ctx.status = 422;
              ctx.body = {
                errors: [
                  {
                    error: err
                  }
                ]
              };
            } else if (!isName) {
              ctx.status = 200;
              ctx.body = {
                message: "Your account information has been successfully updated. Please login with your new password."
              }
            } else {
              let promises = await user.subscribedTo.map(b => getBusinessUpdatePromise(b._id, user));
              await Promise.all(promises)
                .then(values => {
                  if (values) {
                    ctx.status = 200;
                    ctx.body = {
                      message: "Your account information has been successfully updated. Please login with your new password."
                    }
                  }
                }).catch((_error) => {
                  ctx.status = 422;
                  ctx.body = {
                    errors: [
                      {
                        error: _error.message
                      }
                    ]
                  };
                });
            }
          });
        }
      } else {
        // If no user was found, their reset request likely expired. Tell them that.
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: `Your account update request has likely expired. ${!isName ? "You" : "You can still use Google or Facebook to update your user info, or you"} can request a new link in the Login view under ${!isName ? "Already registered using Google or Facebook" : "Forgot password"}.`
            }
          ]
        };
      }
      await next();
    } catch(err) {
      ctx.throw(500, err);
    }
  }
};

/**
 * resetPassword  - Allows user with token from email to reset their password
 */
exports.resetPassword = async(ctx, next) => {
  const {password, passwordConfirm} = ctx.request.body;
  const {resetToken} = ctx.params;

  try {
    if (!password || !passwordConfirm) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.PASSWORD_CONFIRM_FAIL
          }
        ]
      };
    } else if (password.length < 8) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.PASSWORD_TOO_SHORT
          }
        ]
      };
    } else if (password && passwordConfirm && password !== passwordConfirm) {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: ERRORS.PASSWORD_CONFIRM_FAIL
          }
        ]
      };
    } else {
      const user = await User.findOne({
        resetPasswordToken: resetToken,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      });

      if (user) {
        const isSame = await user.comparePassword(password);
        if (isSame) {
          // If the password is the same as the previous one, notify the user.
          ctx.status = 422;
          ctx.body = {
            errors: [
              {
                error: ERRORS.SAME_AS_OLD_PASSWORD
              }
            ]
          };
        } else {
          const newHashedPassword = await user.hashPassword(password);

          await user.update({password: newHashedPassword, resetPasswordToken: undefined, resetPasswordExpires: undefined});

          // If the user reset their password successfully, let them know
          ctx.body = {
            message: "Your password has been successfully updated. Please login with your new password" +
                "."
          };
        }
      } else {
        // If no user was found, their reset request likely expired. Tell them that.
        ctx.status = 422;
        ctx.body = {
          errors: [
            {
              error: ERRORS.PASSWORD_RESET_EXPIRED
            }
          ]
        };
      }
      await next(ctx, next);
    }
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * requireRole  - Ensures a user has a high enough role to access an endpoint
 */
exports.requireRole = async role => async(ctx, next) => {
  const {user} = ctx.state.user;
  try {
    const foundUser = await User.findById(user.id);
    // If the user couldn't be found, return an error
    if (!foundUser) {
      ctx.status = 404;
      ctx.body = {
        errors: [
          {
            error: ERRORS.USER_NOT_FOUND
          }
        ]
      };
    } else {
      // Otherwise, continue checking role
      if (getRole(user.role) >= getRole(role)) {
        await next();
      }

      ctx.status = 403;
      ctx.body = {
        errors: [
          {
            error: ERRORS.NO_PERMISSION
          }
        ]
      };
    }
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * getAuthenticatedUser  - Returns JSON for the authenticated user
 */
exports.getAuthenticatedUser = async(ctx, next) => {
  let user = await User.findById(ctx.state.user.id);
  if (user && user.vendorAccounts && user.vendorAccounts.length && user.notifications && user.notifications.length) {
    let isExpired = date => moment(date).isSameOrBefore(moment());
    let removable = user.notifications.filter(n => n.forCredit && n.expiration && isExpired(n.expiration));
    if (removable.length) {
      await removable.forEach(async r => {
        let i = user.notifications.indexOf(r);
        console.log(`Index of removable (${r.description}): ${i}`);
        let rObj = JSON.parse(r.description.substring(3));
        const { user, business } = rObj;
        await User.findOneAndUpdate(
          {
            _id: user,
            "subscribedTo._id": business
          }, 
          {
            $inc: {
              "subscribedTo.$.activeRequestsCount": -1
            }
          }).then(async (res, err) => {
            if (err) {
              console.log(err);
            } else {
              await user.notifications.splice(i, 1);
            }
        });
      });
      await user.save().then((res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [
              { error: "Notifications could not be updated" }
            ]
          }
        } else {
          ctx.status = 200;
          ctx.body = {
            user: standardizeUser(res)
          };
        }
      });
    } else {
      ctx.status = 200;
      ctx.body = {
        user: standardizeUser(user)
      };
    }
  } else {
    ctx.status = 200;
    ctx.body = {
      user: standardizeUser(user)
    };
  }
  await next();
};

exports.notifyRewardSent = async (ctx, next) => {
  const { userId } = ctx.params;
  let { description } = ctx.request.body;
  try {
    description = description.trim();
    if (description && description.length) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            $each: [{ description }],
            $position: 0
          }
        }
      }).then((res, err) => {
        if (err) {
          ctx.status = 422;
          ctx.body = {
            errors: [{
              error: "The user was not notified due to the following reason: \n" + err
            }]
          }
        } else {
          ctx.status = 200;
          ctx.body = {
            message: "The user has been notified"
          }
        }
      })
    } else {
      ctx.status = 422;
      ctx.body = {
        errors: [{
          error: "The description provided is too short or contained only whitespace"
        }]
      }
    }
    await next();
  } catch(err) {
    ctx.throw(500, err);
  }
};

exports.declineRequest = async (ctx, next) => {
  const { reqUserId, notifId, busName, busId } = ctx.request.body;
  try {
    let requester = await User.findById(reqUserId);
    requester.notifications.unshift({
      description: `${busName} has declined your request. Remember, if you make purchase credits and they are repeatedly declined, you will be permanently blocked from requesting credit from ${busName}.`
    });
    let reqSubData = _.mapKeys(requester.subscribedTo, s => s._id)[busId];
    reqSubData.activeRequestsCount--;
    await requester.save().then(async(result, error) => {
      if (error) {
        ctx.status = 422;
        ctx.body = {
          errors: [{
            error: "Request was not notified nor was their active request limit decremented: \n" + error
          }]
        };
      } else {
        await User.findByIdAndUpdate(ctx.state.user.id, {
          $pull: {
            notifications: {
              _id: notifId
            }
          }
        }, {new: true}).then(res => {
          ctx.status = 200;
          ctx.body = {
            message: `This request from ${requester.fullName} was successfully declined.`,
            notifications: res.notifications
          };
        }).catch(err => {
          ctx.status = 422;
          ctx.body = {
            errors: [{ error: "Notification could not be removed: \n" + err }]
          }
        });
      }
    });
    await next();
  } catch(err) {
    ctx.throw(500, err);
  }
};

exports.clearNotifications = async(ctx, next) => {
  const {userId} = ctx.params;
  try {
    let user = await User.findById(userId);
    user.notifications = user.notifications.filter(n => n.forCredit || n.description.indexOf("REQ") > -1);
    await user.save().then(res => {
      ctx.status = 200;
      ctx.body = {
        notifications: res.notifications
      };
    }).catch(err => {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "Unable to clear notifications since given user id does not correspond to an acco" +
              "unt."
          }
        ]
      };
    });
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};

/**
 * this route will be called consistently to retrieve updated notifications on an interval basis or through manual update
 * 
 * @param {*} ctx 
 * @param {*} next 
 */
exports.getNotifications = async(ctx, next) => {
  try {
    const user = await User.findById(ctx.state.user.id);
    ctx.status = 200;
    ctx.body = {
      notifications: user.notifications
    }
    await next();
  } catch(err) {
    ctx.throw(500, err);
  }
};

exports.removeNotification = async(ctx, next) => {
  const {userId, id} = ctx.params;
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: {
        notifications: {
          _id: id
        }
      }
    }, {new: true}).then(res => {
      ctx.status = 200;
      ctx.body = {
        notifications: res.notifications
      };
    }).catch(err => {
      ctx.status = 422;
      ctx.body = {
        errors: [
          {
            error: "Unable to remove notification since given user id or notification id does not co" +
              "rrespond to an account or notification, respectively."
          }
        ]
      };
    });
    await next();
  } catch (err) {
    ctx.throw(500, err);
  }
};
