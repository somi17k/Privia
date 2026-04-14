const express = require("express");
const crypto = require("crypto");
const router = express.Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

router.get("/", ensureAuth, async (req, res) => {
  try {
    // 🔐 Generate clean proof code
    const proofCode =
      "PRIVIA-" +
      crypto.randomBytes(4).toString("hex").toUpperCase();

    // ⏱ Expiry (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000;

    res.json({
      code: proofCode,
      expiresAt
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate proof" });
  }
});

module.exports = router;