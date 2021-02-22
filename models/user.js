const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const ROLES = require("../constants").ROLES;

const Schema = mongoose.Schema;

const BusinessRefSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Business"
  },
  name: {
    type: String
  },
  verified: {
    type: Boolean,
    default: false
  },
  billing: {
    customerId: {
       type: String
    },
    subscriptionId: {
      type: String
    },
    plan: {
      type: String
    },
    nextPaymentDue: {
      type: Date
    }
  },
});

const purchaseInstanceSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId,
    ref: "Business.purchaseTypes"
  },
  date: {
    type: Date,
    default: new Date()
  },
  quant: {
    type: Number,
    default: 1
  },
  quantUsed: {
    type: Number,
    default: 0
  },
  value: {
    type: Number,
    default: 1
  },
  usedValue: {
    type: Number,
    default: 0
  }
});

// Purchase History Schema
const purchaseSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Business.purchaseTypes"
  },
  count: {
    type: Number,
    default: 1
  },
  countUsed: {
    type: Number,
    default: 0
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Business.categories"
  },
  total: {
    type: Number,
    default: 0
  },
  used: {
    type: Number,
    default: 0
  },
  instances: {
    type: [purchaseInstanceSchema]
  }
}, {
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

const notificationSchema = new Schema({
  description: {
    type: String
  },
  forCredit: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: new Date()
  },
  expiration: {
    type: Date
  }
}, {
  timestamps: true,
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

const SubscribedToSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Business"
  },
  plugger: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  plugged: {
    type: String
  },
  availablePurchaseQuantity: {
    type: Number,
    default: 0
  },
  availablePurchaseAmountSpent: {
    type: Number,
    default: 0
  },
  purchaseHistory: [purchaseSchema],
  purchases: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  appliedPurchases: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  visits: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  appliedVisits: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  amountSpent: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  appliedAmountSpent: {
    count: {
      type: Number,
      default: 0
    },
    recommendeeCount: {
      type: Number,
      default: 0
    }
  },
  usedOffers: [
    {
      _id: {
        type: Schema.Types.ObjectId
      },
      usage: {
        type: Number,
        default: 0
      },
      deleted: {
        type: Boolean,
        default: false
      }
    }
  ],
  activeRequestsCount: {
    type: Number,
    default: 0
  }
});

const PlugRefSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Plug"
  }
});

// User Schema
const UserSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: true
  },
  method: {
    type: String,
    enum: [
      'local', 'google', 'facebook'
    ],
    default: 'local',
    required: true
  },
  googleID: {
    type: String,
    required: this.method === 'google'
  },
  facebookID: {
    type: String,
    required: this.method === 'facebook'
  },
  password: {
    type: String,
    required: this.method === 'local'
  },
  name: {
    first: {
      type: String,
      required: true
    },
    last: {
      type: String,
      required: true
    }
  },
  role: {
    type: String,
    enum: Object
      .keys(ROLES)
      .map(key => ROLES[key]),
    default: ROLES.GUEST
  },
  verifyAccountToken: {
    type: String
  },
  verifyAccountExpires: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  deactivated: {
    type: Boolean,
    default: false
  },
  plugs: [PlugRefSchema],
  notifications: [notificationSchema],
  vendorAccounts: [BusinessRefSchema],
  subscribedTo: [SubscribedToSchema]
}, {
  timestamps: true,
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

UserSchema
  .virtual("fullName")
  .get(function virtualFullName() {
    return `${this.name.first} ${this.name.last}`;
  });

// = =============================== User model hooks =
// =============================== Pre-save of user to database, hash password
// if password is modified or new

UserSchema.pre("save", async function hashPassword(next) {
  const user = this;

  if (user && user.isModified("password") && user.method === 'local') {
    try {
      const salt = await bcrypt.genSalt(5);
      user.password = await bcrypt.hash(user.password, salt, null);
      return next();
    } catch (err) {
      return next(err);
    }
  } else {
    return next();
  }
});

// = =============================== User model methods =
// =============================== Method to compare password for login
UserSchema.methods = {
  async hashPassword(newPassword) {
    try {
      const salt = await bcrypt.genSalt(5);
      return await bcrypt.hash(newPassword, salt, null);
    } catch (err) {
      throw new Error(err);
    }
  },
  async comparePassword(candidatePassword) {
    try {
      if (this.password) {
        return await bcrypt.compare(candidatePassword, this.password);
      } else {
        return false;
      }
    } catch (err) {
      throw new Error(err);
    }
  }
};

module.exports = mongoose.model("user", UserSchema, "users");
