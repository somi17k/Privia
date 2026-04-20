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

router.get("/proof/:code", async (req, res) => {
  try {
    const inputCode = typeof req.params?.code === "string" ? req.params.code : "";
    const code = inputCode.trim().toUpperCase();

    if (!code) {
      return res.status(400).send("<h3>Invalid proof code.</h3>");
    }

    const proof = await Proof.findOne({ code }).populate("userId");
    if (!proof || !proof.userId) {
      return res.status(404).send("<h3>Proof not found.</h3>");
    }

    const expiresAt = new Date(proof.expiresAt);
    if (new Date() > expiresAt) {
      await Proof.deleteOne({ _id: proof._id });
      return res.status(410).send("<h3>Proof expired. Please request a new QR proof.</h3>");
    }

    if (!proof.userId.verified) {
      return res.status(403).send("<h3>User is not approved by admin.</h3>");
    }

    await Proof.deleteOne({ _id: proof._id });

    return res.send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privia Proof Verification</title>
        <style>
          body { font-family: Arial, sans-serif; background:#f4f7fc; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }
          .card { background:#fff; padding:24px; border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,0.08); max-width:420px; width:92%; text-align:center; }
          .ok { color:#198754; font-size:22px; font-weight:700; margin-bottom:10px; }
          .muted { color:#5f6b7a; margin:0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="ok">Identity Verified</div>
          <p class="muted">Verified user: <strong>${proof.userId.name}</strong></p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send("<h3>Verification failed. Please try again.</h3>");
  }
});

module.exports = router;
