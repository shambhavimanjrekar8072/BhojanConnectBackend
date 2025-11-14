const express = require("express");
const router = express.Router();
const donorTransactionController = require("../controllers/donorTransactionController");

// Record donation
router.post("/donate", donorTransactionController.donateFood);

// Get donors for a specific NGO
router.get("/donors/:ngoId", donorTransactionController.getDonorsByNGO);

module.exports = router;
