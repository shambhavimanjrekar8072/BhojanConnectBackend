const mongoose = require("mongoose");
const RecipientTransaction = require("../models/RecipientTransaction");
const NGO = require("../models/NGO");

//  Book Food API (Plates reduce here)
const bookFood = async (req, res) => {
  try {
    const { recipientId, ngoId, quantity } = req.body;

    // Validation checks
    if (!recipientId || !ngoId || !quantity) {
      return res.status(400).json({
        error: "Recipient ID, NGO ID, and quantity are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(recipientId) ||
      !mongoose.Types.ObjectId.isValid(ngoId)
    ) {
      return res.status(400).json({
        error: "Invalid recipientId or ngoId format.",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than 0.",
      });
    }

    //  Find the NGO
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ error: "NGO not found." });
    }

    //  Check plates availability
    if (ngo.platesAvailable < quantity) {
      return res.status(400).json({
        error: "Not enough plates available in the NGO.",
      });
    }

    //  Reduce plates on booking
    ngo.platesAvailable -= quantity;
    await ngo.save();

    // Create a booking transaction
    const transaction = new RecipientTransaction({
      recipientId,
      ngoId,
      quantity,
      transactionType: "book",
    });
    await transaction.save();

    res.status(201).json({
      message: "Food booked successfully! Plates reduced.",
      transaction,
      updatedPlates: ngo.platesAvailable,
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({
      error: "Server error while booking food.",
      details: err.message,
    });
  }
};

//  Take Food API
const takeFood = async (req, res) => {
  try {
    const { recipientId, ngoId, quantity } = req.body;

    // Validation
    if (!recipientId || !ngoId || !quantity) {
      return res.status(400).json({ error: "Recipient ID, NGO ID, and quantity are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId) || !mongoose.Types.ObjectId.isValid(ngoId)) {
      return res.status(400).json({ error: "Invalid recipientId or ngoId format." });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0." });
    }

    // Find the booked transaction(s) for this recipient and NGO
    const bookedTransactions = await RecipientTransaction.find({
      recipientId,
      ngoId,
      transactionType: "book",
    }).sort({ createdAt: 1 }); // optional: first booked gets taken first

    let remainingToTake = bookedTransactions.reduce(
      (acc, txn) => acc + (txn.quantity - (txn.taken || 0)),
      0
    );

    if (remainingToTake <= 0) {
      return res.status(400).json({ error: "No booked food available to take." });
    }

    if (quantity > remainingToTake) {
      return res.status(400).json({ error: `You can only take up to ${remainingToTake} plates.` });
    }

    // Update the booked transactions sequentially
    let qtyToTake = quantity;
    for (const txn of bookedTransactions) {
      const available = txn.quantity - (txn.taken || 0);
      if (available <= 0) continue;

      const takeNow = Math.min(available, qtyToTake);
      txn.taken = (txn.taken || 0) + takeNow;
      await txn.save();

      qtyToTake -= takeNow;
      if (qtyToTake <= 0) break;
    }

    res.status(200).json({
      message: "Food taken successfully (book transaction updated).",
      totalTaken: quantity,
      remainingAfterTake: remainingToTake - quantity,
    });
  } catch (err) {
    console.error("Take food error:", err);
    res.status(500).json({
      error: "Server error while taking food.",
      details: err.message,
    });
  }
};


// List all recipient transactions
const getAllRecipientTransactions = async (req, res) => {
  try {
    const transactions = await RecipientTransaction.find()
      .populate("recipientId", "name email")
      .populate("ngoId", "username email platesAvailable");

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
// List recipients who booked food from a specific NGO
const listRecipientsBooked = async (req, res) => {
  try {
    const { ngoId } = req.params;

    if (!ngoId) return res.status(400).json({ error: "NGO ID is required." });

    if (!mongoose.Types.ObjectId.isValid(ngoId)) {
      return res.status(400).json({ error: "Invalid ngoId format." });
    }

    const ngoObjId = new mongoose.Types.ObjectId(ngoId);

    const bookings = await RecipientTransaction.aggregate([
      { $match: { ngoId: ngoObjId, transactionType: "book" } },
      { $group: { _id: "$recipientId", totalBooked: { $sum: "$quantity" } } },
      {
        $lookup: {
          from: "recipients",       // MongoDB collection name
          localField: "_id",
          foreignField: "_id",
          as: "recipientInfo",
        },
      },
      { $unwind: "$recipientInfo" },
      {
        $project: {
          _id: 0,
          recipientId: "$_id",
          name: "$recipientInfo.username", // <-- use correct field
          email: "$recipientInfo.email",
          totalBooked: 1,
        },
      },
    ]);

    res.status(200).json({ ngoId, recipients: bookings });
  } catch (err) {
    console.error("List recipients error:", err);
    res.status(500).json({
      error: "Server error while fetching booked recipients.",
      details: err.message,
    });
  }
};



module.exports = {
  bookFood,
  takeFood,
  getAllRecipientTransactions,
  listRecipientsBooked,
};
