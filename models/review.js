const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema({
    content: String,
    rating: Number,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"  // Reference to the User model
    },
    createdAt: {
      type: Date,
      default: Date.now  // Automatically set creation time
    }
  });
  
  module.exports = mongoose.model("Review", reviewSchema);