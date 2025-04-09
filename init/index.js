const express = require("express");
const mongoose = require("mongoose");
const initData = require("./data.js");
const listing = require("../models/listing.js");


main()
.then(()=>{
    console.log("connected to db");
})
.catch((err)=>console.log(err));

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}

const initDB = async () => {
    try {
        // Clear existing data
        await listing.deleteMany({});
        
        // Map new data with owner field
        const modifiedData = initData.data.map(obj => ({
            ...obj,
            owner: '67f22b5a966bdfa95b06997b'
        }));
        
        // Insert new data
        await listing.insertMany(modifiedData);
        
        console.log("Data was initialized successfully");
    } catch (error) {
        console.error("Error initializing data:", error);
        throw error; // Re-throw if you want calling code to handle it
    }
};

// Usage example:
// initDB().then(() => console.log("Done")).catch(console.error);
initDB();

