const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const router = express.Router();
const PROOF_TTL_MS = 30 * 1000;

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

router.get("/", ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const claims = Array.isArray(user.claims) ? user.claims : [];
    const hasVerifiedEmailClaim = claims.some(
      (claim) => claim.type === "email_verified" && claim.verified
    );

    if (!hasVerifiedEmailClaim) {
      return res.status(403).json({ error: "Claim not verified" });
    }

    const shouldRegenerate = req.query.regenerate === "1" || req.query.regenerate === "true";
    const existingProof = user.activeProof;
    if (!shouldRegenerate && existingProof?.code && existingProof?.expiresAt) {
      const existingExpiry = new Date(existingProof.expiresAt);
      if (existingExpiry > new Date()) {
        return res.json({
          code: existingProof.code,
          expiresAt: existingExpiry.toISOString()
        });
      }
    }

    // 🔐 Generate clean proof code
    const proofCode =
      "PRIVIA-" +
      crypto.randomBytes(4).toString("hex").toUpperCase();

    // ⏱ Expiry (30 seconds)
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + PROOF_TTL_MS);

    user.activeProof = {
      code: proofCode,
      claimType: "email_verified",
      issuedAt,
      expiresAt
    };
    await user.save();

    res.json({
      code: proofCode,
      expiresAt: expiresAt.toISOString()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate proof" });
  }
});

module.exports = router;
