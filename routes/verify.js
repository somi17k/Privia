const express = require("express");
const verifyClaim = require("../utils/verifyClaim");
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

module.exports = router;
