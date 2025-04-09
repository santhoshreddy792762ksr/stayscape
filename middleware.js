module.exports.isLoggedIn = (req, res, next)=>{
    if(!req.isAuthenticated()){
        req.flash("error","must be logged to make changes!");
        return res.redirect("/loggin");
}
next();
}
