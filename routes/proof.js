const express = require("express");
const crypto = require("crypto");
const signClaim = require("../utils/signClaim");
const router = express.Router();

// ensure user is logged in
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

router.get("/", ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // privacy-preserving subject
    const subject = crypto
      .createHash("sha256")
      .update(userId)
      .digest("hex");

    const issuedAt = new Date();
const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000); // 5 minutes

const claim = {
  type: "email_verified",
  subject: crypto.createHash("sha256")
    .update(user.email)
    .digest("hex"),
  issuer: "Privia",
  issuedAt,
  expiresAt
};

    const signedClaim = signClaim(claim);

    res.json(signedClaim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate proof" });
  }
});

module.exports = router;
