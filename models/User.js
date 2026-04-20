const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  emailHash: {
    type: String,
    unique: true,
    sparse: true
  },

  password: {
    type: String,
    required: true
  },

  idProof: {
  type: String
},
  
   role: {
    type: String,
    default: "user"
  },

  verified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  rejectionReason: {
    type: String,
    default: null
  },

  rejectedAt: {
    type: Date,
    default: null
  },

  claims: [
    {
      type: {
        type: String,
        required: true
      },
      hash: {
        type: String
      },
      verified: {
        type: Boolean,
        default: false
      },
      issuedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  activeProof: {
    code: {
      type: String
    },
    claimType: {
      type: String
    },
    issuedAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    }
  },

  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", UserSchema);
