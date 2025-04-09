const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Listing = require("./models/listing.js"); // Adjust the path accordingly
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const WrapAsync = require("./utils/WrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const{listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })



app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}))
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOptions = {
    secret:"mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        sameSite: 'lax' // or 'strict' for better security
    }
};
app.get("/",(req,res)=>{
    res.send("hi iam root");
});


app.use(session(sessionOptions));
app.use(express.urlencoded({ extended: true }));  // Parse form data
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})



main()
.then(()=>{
    console.log("connected to db");
})
.catch((err)=>console.log(err));

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}


// const validateListing = (req, res,next)=>{
//     let{error} = listingSchema.validate(req.body);
//     if(error){
//         let errMsg = error.details.map((el)=> el.message).join(",");
//         throw new ExpressError(400, errMsg);
//     }else{
//         next();
//     }
// };

// const validateReview = (req, res,next)=>{
//     let{error} = reviewSchema.validate(req.body);
//     if(error){
//         let errMsg = error.details.map((el)=> el.message).join(",");
//         throw new ExpressError(400, errMsg);
//     }else{
//         next();
//     }
// };



app.get("/listings", WrapAsync(async(req,res)=>{
    const allListings = await Listing.find({});
    res.render("index.ejs",{allListings});
}));


//   singup rout geet requiest
// Signup Route - GET
app.get("/signup", (req, res) => {
    res.render("users/signup", { 
        error: req.flash("error") 
    });
});

// Signup Route - POST
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            req.flash("error", "All fields are required");
            return res.redirect("/signup");
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            req.flash("error", "Username already registered");
            return res.redirect("/signup");
        }

        // Register user
        const registeredUser = await User.register({ username, email }, password);
        
        // Login the user
        req.login(registeredUser, (err) => {
            if (err) {
                req.flash("error", "Registration successful but login failed");
                return res.redirect("/login");
                return next(err);
            }
            req.flash("success", "Welcome to StayScape!");
            res.redirect("/listings");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
});

// login get 
// GET Login Page
app.get("/login", (req, res) => {
    res.render("users/login", {
        error: req.flash("error"),
        success: req.flash("success"),
        formData: req.flash("formData")[0] || {}
    });
});

// POST Login Authentication
app.post("/login", 
    (req, res, next) => {
        // Store form data in case of failure
        req.flash("formData", { username: req.body.username });
        next();
    },
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: {
            type: 'error',
            message: 'Invalid username or password. Please try again.'
        },
        successFlash: {
            type: 'success',
            message: 'Welcome back! You have successfully logged in.'
        }
    }),
    (req, res) => {
        // Custom success handler
        const redirectUrl = req.session.returnTo || "/listings";
        delete req.session.returnTo;
        req.flash("success", "Welcome back to StayScape!");
        res.redirect(redirectUrl);
    }
);

// Error handling middleware for login
app.use((err, req, res, next) => {
    if (err) {
        console.error('Login error:', err);
        req.flash("error", "An error occurred during login. Please try again.");
        return res.redirect("/login");
    }
    next();
});

// logout get rout
app.get("/logout",(req, res, next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","you are logged out!");
        res.redirect("/listings");
    });
});

app.get("/listings/new",(req,res)=>{
    res.render("new.ejs");
});

// show rout
app.get("/listings/:id", WrapAsync(async (req, res, next) => {
    const { id } = req.params;
    
    // Validate the ID format first
    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Invalid listing ID");
        return res.redirect("/listings");
    }

    const listing = await Listing.findById(id)
        .populate({path:"reviews"})
        .populate({
            path: "owner",path:"author",
            model: "User" // Explicitly specify the model
            // Optional: select specific fields
            // select: 'username email'
        });

    if (!listing) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    res.render("show.ejs", { listing });
}));
 
//Create Route
// GET route to show the form
app.get("/listings/new", (req, res) => {
    res.render("new", {
        error: req.flash("error")[0],
        title: req.flash("title")[0],
        description: req.flash("description")[0],
        price: req.flash("price")[0],
        location: req.flash("location")[0],
        country: req.flash("country")[0]
    });
});


const fs = require('fs');

app.post("/listings", 
    upload.array('images', 5),
    WrapAsync(async (req, res, next) => {
        try {
            // Validate required fields
            const requiredFields = ['title', 'description', 'price', 'location', 'country'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            
            if (missingFields.length > 0) {
                // Store all form data in flash
                requiredFields.forEach(field => {
                    req.flash(field, req.body[field]);
                });
                req.flash("error", `Missing required fields: ${missingFields.join(', ')}`);
                return res.redirect("/listings/new"); // RETURN here is crucial
            }

            // Process uploaded files
            const images = req.files?.map(file => ({
                url: `/uploads/${file.filename}`,
                filename: file.filename
            })) || [];

            // Create new listing
            const newListing = new Listing({
                title: req.body.title,
                description: req.body.description,
                price: parseFloat(req.body.price),
                location: req.body.location,
                country: req.body.country,
                images: images,
                owner: req.user._id
            });

            await newListing.save();
            req.flash("success", "Listing created successfully!");
            return res.redirect("/listings"); // RETURN here is crucial
            
        } catch (err) {
            // Clean up uploaded files if error occurs
            if (req.files) {
                req.files.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(__dirname, 'public/uploads', file.filename));
                    } catch (cleanupErr) {
                        console.error("Error cleaning up file:", cleanupErr);
                    }
                });
            }

            // Store form data in flash to repopulate form
            ['title', 'description', 'price', 'location', 'country'].forEach(field => {
                req.flash(field, req.body[field]);
            });

            // Handle different error types
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(e => e.message);
                req.flash("error", messages.join(', '));
            } 
            else if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash("error", "File too large (max 5MB)");
            }
            else if (err.message.includes('Only JPEG and PNG')) {
                req.flash("error", "Only JPEG and PNG images are allowed");
            }
            else {
                req.flash("error", "An unexpected error occurred");
                console.error(err);
            }
            
            return res.redirect("/listings/new"); // RETURN here is crucial
        }
    })
);
// app.post((req, res)=>{
//     res.send(req.body);
// });


app.get("/listings/:id/edit",  WrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("edit.ejs", { listing });
  }));

  //Update Route
app.put("/listings/:id",  WrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect(`/listings/${id}`);
  }));
  

  app.delete("/listings/:id", WrapAsync(async(req,res)=>{
    let{id} = req.params;
    let deleteListing= await Listing.findByIdAndDelete(id);
    console.log(deleteListing);
    res.redirect("/listings");
}));
// reviews
// post route
app.post("/listings/:id/reviews", 
    WrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        
        // Create review with default values
        const newReview = new Review({
            content: req.body.review?.content || '',
            rating: req.body.review?.rating || 3,
            author: req.user?._id
        });
        
        await newReview.save();
        listing.reviews.push(newReview._id);
        await listing.save();

        // Redirect with success parameter instead of flash
        res.redirect(`/listings/${listing._id}?success=true`);
    })
);

app.get("/listings/:id", 
    WrapAsync(async (req, res) => {
        const listing = await Listing.findById(req.params.id)
            .populate("reviews")
            .populate("author");
        
        // Pass success status from query parameter
        res.render("listings/show", { 
            listing,
            success: req.query.success
        });
    })
);

app.all("*", (req, res, next)=>{
    next(new ExpressError(404, "page not found!"));
});

//  error handler
app.use((err, req, res, next)=>{
    let{statusCode = 500, message = "something went wrong!"} = err;
    res.redirect("/listings")
    res.status(statusCode).send(message);
});

// additional
app.use((req, res, next) => {
    console.log('Incoming body:', req.body);
    next();
});


app.listen(3000,()=>{
    console.log("server listening to port 3000");
});