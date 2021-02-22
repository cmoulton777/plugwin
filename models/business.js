const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const shortid = require("shortid");

const cur = new Date();
const {OFFER_TYPES} = require("../constants");

const LinkSchema = new Schema({
  label: {
    type: String,
    required: true
  },
  val: {
    type: String,
    required: true
  }
});

const UserRefSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  name: {
    type: String,
    default: "John Smith"
  },
  email: {
    type: String,
    lowercase: true
  }
});

const OfferSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  deleted: {
    type: Boolean,
    default: false
  },
  vendorActionRequired: {
    type: Boolean,
    default: false
  },
  expDate: {
    type: Date,
    max: cur.setDate(cur.getDate() + 182500)
  },
  maxUsageCount: {
    type: Number,
    min: 1,
    max: 100,
    default: 1,
    required: true
  },
  offerType: {
    type: String,
    enum: [
      OFFER_TYPES.DEF, OFFER_TYPES.EARNED
    ],
    default: OFFER_TYPES.DEF,
    required: true
  },
  earnedOffer: {
    strategy: {
      type: String,
      enum: [OFFER_TYPES.STRAT_TYPES.REC_LOY, OFFER_TYPES.STRAT_TYPES.REC, OFFER_TYPES.STRAT_TYPES.LOY]
    },
    userMetric: {
      type: String,
      enum: [OFFER_TYPES.PURCH_TYPES.UNIQUE, OFFER_TYPES.PURCH_TYPES.NUM_OF, OFFER_TYPES.PURCH_TYPES.AMT]
    },
    recomendeeMetric: {
      type: String,
      enum: [OFFER_TYPES.PURCH_TYPES.UNIQUE, OFFER_TYPES.PURCH_TYPES.NUM_OF, OFFER_TYPES.PURCH_TYPES.AMT]
    },
    userQuant: {
      type: Number,
      min: 0,
      max: 99999999
    },
    recomendeeQuant: {
      type: Number,
      min: 0,
      max: 99999999
    },
    method: {
      type: String,
      enum: [OFFER_TYPES.METHOD_TYPES.BY_PURCH, OFFER_TYPES.METHOD_TYPES.BY_CAT, OFFER_TYPES.METHOD_TYPES.DEFAULT],
      default: ""
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Business.categories"
    },
    purchaseType: {
      type: Schema.Types.ObjectId,
      ref: "Business.purchaseTypes"
    },
    noEarlierThan: {
      type: Date
    },
    required: this.offerType === OFFER_TYPES.EARNED
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

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true
  }
});

const PurchaseTypeSchema = new Schema({
  description: {
    type: String,
    trim: true,
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Business.categories"
  },
  visits: {
    type: Number,
    default: 1
  },
  purchases: {
    type: Number,
    default: 1
  },
  amountSpent: {
    type: Number,
    required: true
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

const BusinessSchema = new Schema({
  id: {
    type: String,
    unique: true,
    default: shortid.generate
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  verified: {
    type: Boolean,
    required: true,
    default: false
  },
  image: {
    type: String
  },
  primaryColor: {
    type: String
  },
  secondaryColor: {
    type: String
  },
  verifyAccountToken: {
    type: String
  },
  verifyAccountExpires: {
    type: Date
  },
  deleteAccountToken: {
    type: String,
    default: null
  },
  deleteAccountExpires: {
    type: Date,
    default: null
  },
  email: {
    type: String,
    required: true
  },
  category: {
    type: Number,
    min: [
      1000, "Invalid category (1000 - 1025, inclusive)"
    ],
    max: [
      1025, "Invalid category (1000 - 1025, inclusive)"
    ],
    required: true
  },
  subcategory: {
    type: Number,
    min: [
      2000, "Invalid category (2000 - 2297, inclusive)"
    ],
    max: [
      2297, "Invalid category (2000 - 2297, inclusive)"
    ],
    required: true
  },
  links: {
    type: [LinkSchema],
    required: true
  },
  categories: {
    type: [CategorySchema]
  },
  purchaseTypes: {
    type: [PurchaseTypeSchema]
  },
  offers: {
    type: [OfferSchema],
    required: false
  },
  offersLength: {
    type: Number,
    default: 0,
    required: false
  },
  // foreign key User(s) --> Subscribed
  subscribed: {
    type: [UserRefSchema]
  },

  // foreign key Requests(s) --> business (for notifications) requests: [{ type:
  // Schema.Types.ObjectId, ref: 'Request' }], optional
  description: {
    type: String,
    trim: true
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

module.exports = mongoose.model("business", BusinessSchema, "businesses");
