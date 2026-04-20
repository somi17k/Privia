const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const Proof = require("../models/Proof");
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
    if (!shouldRegenerate) {
      const existingProof = await Proof.findOne({
        userId: user._id,
        expiresAt: { $gt: new Date() }
      }).sort({ expiresAt: -1 }).lean();

      if (existingProof) {
        return res.json({
          code: existingProof.code,
          expiresAt: new Date(existingProof.expiresAt).toISOString()
        });
      }
    }

    // 🔐 Generate clean proof code
    const proofCode =
      "PRIVIA-" +
      crypto.randomBytes(4).toString("hex").toUpperCase();

    // ⏱ Expiry (30 seconds)
    const expiresAt = new Date(Date.now() + PROOF_TTL_MS);

    await Proof.deleteMany({ userId: user._id });
    await Proof.create({
      code: proofCode,
      userId: user._id,
      expiresAt
    });

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
