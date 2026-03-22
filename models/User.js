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

  claims: [
    {
      type: {
        type: String,
        required: true
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

  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", UserSchema);
