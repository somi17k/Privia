const mongoose = require("mongoose");

const ProofSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model("Proof", ProofSchema);
