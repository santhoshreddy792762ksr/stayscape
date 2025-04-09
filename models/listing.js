const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    image:{
        filename: String,
    url: String,
    },
    price:Number,
    location:String,
    country:String,
    reviews:[
        {
        content: String,
        rating: Number,
        type:mongoose.Schema.Types.ObjectId,
        ref:"Review",
        },
      ],
      owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
      },
      author: {  // Add this if you need an author field
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'
    }]
}, { 
    // Optional: disable strict populate if needed
    strictPopulate: false 
      
});

const listing = mongoose.model("listing",listingSchema);

module.exports = listing;