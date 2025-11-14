const DonorTransaction = require("../models/DonorTransaction");
const Donor = require("../models/Donor");
const NGO = require("../models/NGO");
const mongoose = require("mongoose");

// Record a donor's food donation
const donateFood = async (req, res) => {
  try {
    const { donorId, ngoId, quantity } = req.body;

    // Check for missing fields
    if (!donorId || !ngoId || !quantity) {
      return res.status(400).json({
        error: "All fields are required: donorId, ngoId, quantity",
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(donorId) || !mongoose.Types.ObjectId.isValid(ngoId)) {
      return res.status(400).json({ error: "Invalid donorId or ngoId format" });
    }

    //  Verify donor and NGO exist
    const donor = await Donor.findById(donorId);
    const ngo = await NGO.findById(ngoId);

    if (!donor || !ngo) {
      return res.status(404).json({ error: "Donor or NGO not found" });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    // Create new donation transaction
    const transaction = new DonorTransaction({
      donorId,
      ngoId,
      quantity,
    });

    await transaction.save();

    //Update NGO’s available plates count
    ngo.platesAvailable += quantity;
    await ngo.save();

    res.status(201).json({
      message: "Donation recorded successfully",
      transaction,
    });
  } catch (err) {
    console.error("Donation error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// 📋 Get Donors for a specific NGO
const getDonorsByNGO = async (req, res) => {
  try {
    const { ngoId } = req.params;

    if (!ngoId) {
      return res.status(400).json({ error: "NGO ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(ngoId)) {
      return res.status(400).json({ error: "Invalid NGO ID format." });
    }

    const ngoObjId = new mongoose.Types.ObjectId(ngoId);

    // Aggregate donations grouped by donor
    const donations = await DonorTransaction.aggregate([
      { $match: { ngoId: ngoObjId } }, // Filter donations to this NGO
      { $group: { _id: "$donorId", totalDonated: { $sum: "$quantity" } } }, // Sum donations per donor
      {
        $lookup: {
          from: "donors", // Collection name in MongoDB
          localField: "_id",
          foreignField: "_id",
          as: "donorInfo",
        },
      },
      { $unwind: "$donorInfo" }, // Flatten the array
      {
        $project: {
          _id: 0,
          donorId: "$_id",
          name: "$donorInfo.username",
          email: "$donorInfo.email",
          phone: "$donorInfo.phone",
          aadhar: "$donorInfo.aadhar",
          totalDonated: 1,
        },
      },
    ]);

    res.status(200).json({
      ngoId,
      donors: donations,
    });
  } catch (err) {
    console.error("Get donors error:", err);
    res.status(500).json({
      error: "Server error while fetching donors for NGO.",
      details: err.message,
    });
  }
};

module.exports = { getDonorsByNGO , donateFood  };

