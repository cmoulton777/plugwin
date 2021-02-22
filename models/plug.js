const mongoose = require("mongoose");
const shortid = require("shortid");
const Schema = mongoose.Schema;

const VisitorSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  date: {
    type: Date,
    default: new Date()
  }
});

const PlugSchema = new Schema(
  {
    id: {
      type: String,
      unique: true,
      default: shortid.generate
    },
    orig: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business"
    },
    visits: [VisitorSchema],
    visitCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  }
);

module.exports = mongoose.model("Plug", PlugSchema);
