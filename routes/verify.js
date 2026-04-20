const express = require("express");
const verifyClaim = require("../utils/verifyClaim");
const Proof = require("../models/Proof");
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

    const proof = await Proof.findOne({ code }).populate("userId");
    if (!proof || !proof.userId) {
      return res.json({ valid: false });
    }

    const expiresAt = new Date(proof.expiresAt);
    if (new Date() > expiresAt) {
      await Proof.deleteOne({ _id: proof._id });
      return res.json({ valid: false, reason: "expired" });
    }

    if (!proof.userId.verified) {
      return res.json({ valid: false });
    }

    await Proof.deleteOne({ _id: proof._id });

    return res.json({
      valid: true,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    return res.status(500).json({ valid: false });
  }
});

module.exports = router;
