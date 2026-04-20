const express = require("express");
const verifyClaim = require("../utils/verifyClaim");
const User = require("../models/User");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Verifier endpoint is running. Use POST to verify claims.");
});

router.post("/", (req, res) => {
  try {
    const signedClaim = req.body;
    const valid = verifyClaim(signedClaim);

    res.json({ valid });
  } catch (err) {
    res.status(400).json({ valid: false });
  }
});

router.post("/proof", async (req, res) => {
  try {
    const inputCode = typeof req.body?.code === "string" ? req.body.code : "";
    const code = inputCode.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ valid: false });
    }

    const user = await User.findOne({ "activeProof.code": code });
    if (!user || !user.activeProof) {
      return res.json({ valid: false });
    }

    const expiresAt = new Date(user.activeProof.expiresAt);
    if (new Date() > expiresAt) {
      user.activeProof = undefined;
      await user.save();
      return res.json({ valid: false });
    }

    const claimType = user.activeProof.claimType || "email_verified";
    const claims = Array.isArray(user.claims) ? user.claims : [];
    const hasVerifiedClaim = claims.some(
      (claim) => claim.type === claimType && claim.verified
    );

    if (!hasVerifiedClaim) {
      return res.json({ valid: false });
    }

    const validatedExpiresAt = user.activeProof.expiresAt;
    user.activeProof = undefined;
    await user.save();

    return res.json({
      valid: true,
      claimType,
      expiresAt: validatedExpiresAt
    });
  } catch (err) {
    return res.status(500).json({ valid: false });
  }
});

module.exports = router;
