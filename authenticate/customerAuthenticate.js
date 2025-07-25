const jwt = require("jsonwebtoken");
const usersDB = require("../models/Users");

const customerauthenticate = async (req, res, next) => {
    try {
        const token = req.cookies.cookies1;
        
        if (!token) {
            throw new Error("No token provided");
        }

        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        if (!decoded || !decoded._id) {
            throw new Error("Invalid token structure");
        }

        // Find user by ID and check if token exists in their tokens array
        const rootUser = await usersDB.findOne({ 
            _id: decoded._id, 
            "tokens.token": token 
        });


        if (!rootUser) {
            throw new Error("User not found or token invalid");
        }

        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;

        next();
    } catch (err) {
        console.error(`Authentication error - ${err.message}`);
        res.status(401).send("Unauthorized: " + err.message);
    }
};

module.exports = customerauthenticate;