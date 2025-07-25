const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cloudinary = require("cloudinary").v2;
const os = require("os");
const crypto = require('crypto');
const moment = require("moment");
const si = require("systeminformation");
const exec = require("child_process").exec;
const shortid = require("shortid");
const mongoose = require("mongoose");
const multer = require("multer");
const bcryptjs = require("bcryptjs");
const cookieParser = require("cookie-parser");
const schedule = require("node-schedule");

app.use(cookieParser());

const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
app.use(cors());

require("./config/connection");

const authenticate = require("./authenticate/customerAuthenticate");

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const UsersDB = require("./models/Users");
const FortunesDB = require('./models/Fortunes');
const BollywoodDialogueDB = require('./models/BollywoodDialogue');
const DailyQuestionsDB = require('./models/DailyQuestion');
const FriendFortuneDB = require('./models/FriendFortune');
const MummyScoldingDB = require('./models/MummyScolding');
const SharmaJiBetaDB = require('./models/SharmaJiBeta');

app.post(
    "/api/auth/register",
    async (req, res) => {
        try {
            const { name, email, password, confirmPassword, preferredCategories, subscribeNewsletter } = req.body;

            // Validate required fields
            if (!name || !email || !password || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide all required fields"
                });
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Passwords do not match"
                });
            }

            // Validate password length
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 8 characters"
                });
            }

            // Validate email format
            const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address"
                });
            }

            // Check if email already exists
            const existingUser = await UsersDB.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email address is already registered"
                });
            }

            // Generate unique username
            function generateUniqueUsername(name) {
                // Remove spaces and convert to lowercase
                const baseName = name.toLowerCase().replace(/\s+/g, '');
                // Generate a random string of 6 characters (alphanumeric)
                const randomString = crypto.randomBytes(3).toString('hex');
                return `${baseName.substring(0, 10)}_${randomString}`;
            }

            const username = generateUniqueUsername(name);

            // Create new user
            const newUser = new UsersDB({
                name,
                email: email.toLowerCase(),
                username,
                userType: "User",
                password, // Will be hashed by the pre-save hook in the model
                preferredCategories: preferredCategories || [],
                profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                badges: ["Newbie"],
                points: 10, // Starting points for new users
                subscribeNewsletter: subscribeNewsletter || false
            });

            // Save the user (password will be hashed automatically by the pre-save hook)
            await newUser.save();

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            // In a real app, you would save this token to send via email
            // await new EmailVerificationToken({ userId: newUser._id, token: verificationToken }).save();

            // Generate JWT token for immediate login after registration
            const token = newUser.generateAuthToken();

            // Prepare user data to return (excluding sensitive information)
            const userData = {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                profilePic: newUser.profilePic,
                preferredCategories: newUser.preferredCategories,
                badges: newUser.badges,
                points: newUser.points,
                createdAt: newUser.createdAt
            };

            console.log("User registered successfully:", newUser.username);

            return res.status(201).json({
                success: true,
                message: "Registration successful! Welcome to Tukka Time!",
                token, // Send JWT token if you want immediate login
                user: userData
            });

        } catch (err) {
            console.error(`Error during user registration: ${err.message}`);
            return res.status(500).json({
                success: false,
                message: "Registration failed. Please try again later."
            });
        }
    }
);

app.post("/api/auth/login", async (req, res) => {
    const Email = req.body.email;
    const Password = req.body.password;

    const data1 = await UsersDB.findOne({
        email: Email,
    }).select('+password');

    if (data1) {
        const isMatch = await bcryptjs.compare(Password, data1.password);
        if (isMatch === true) {
            const token = await data1.generateAuthToken();

            // Store the token in the user's tokens array
            data1.tokens = data1.tokens.concat({ token });
            await data1.save();

            const user = await UsersDB.updateOne({ _id: data1._id }, { status: "online" });

            res.cookie("cookies1", token, {
                expires: new Date(Date.now() + 2592000000),
                httpOnly: true,
            });

            console.log("Login Successful");
            res.status(200).json({
                success: true,
                token,
                user: {
                    _id: data1._id,
                    email: data1.email,
                    firstName: data1.firstName
                }
            });
        } else {
            res.send("Sorry Password And Email Are Not Matched As Per Our System.");
        }
    }
});

// app.post(
//     "/api/auth/login",
//     async (req, res) => {
//         try {
//             const { email, password } = req.body;

//             // Validate required fields
//             if (!email || !password) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Please provide both email and password"
//                 });
//             }

//             // Find user by email and include the password field (which is normally excluded)
//             const user = await UsersDB.findOne({ email: email.toLowerCase() }).select('+password +failedLoginAttempts +accountLockedUntil');

//             // Check if account is locked
//             if (user?.accountLockedUntil && user.accountLockedUntil > new Date()) {
//                 const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / (1000 * 60));
//                 return res.status(403).json({
//                     success: false,
//                     message: `Account temporarily locked. Try again in ${remainingTime} minutes.`
//                 });
//             }

//             // Check if user exists
//             if (!user) {
//                 return res.status(401).json({
//                     success: false,
//                     message: "Invalid email or password"
//                 });
//             }

//             // Compare passwords
//             const isMatch = await user.comparePassword(password);

//             if (!isMatch) {
//                 // Increment failed login attempts
//                 user.failedLoginAttempts += 1;

//                 // Lock account after 5 failed attempts
//                 if (user.failedLoginAttempts >= 5) {
//                     user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
//                     await user.save();

//                     return res.status(403).json({
//                         success: false,
//                         message: "Too many failed attempts. Account locked for 30 minutes."
//                     });
//                 }

//                 await user.save();

//                 return res.status(401).json({
//                     success: false,
//                     message: "Invalid email or password",
//                     attemptsRemaining: 5 - user.failedLoginAttempts
//                 });
//             }

//             // Reset failed login attempts on successful login
//             user.failedLoginAttempts = 0;
//             user.accountLockedUntil = null;
//             user.lastLogin = new Date();

//             // Add to login history (you might want to get IP and device info from req)
//             user.loginHistory.push({
//                 ipAddress: req.ip,
//                 device: req.headers['user-agent'],
//                 timestamp: new Date()
//             });

//             await user.save();

//             // Generate JWT token
//             const token = user.generateAuthToken();

//             // Prepare user data to return (excluding sensitive information)
//             const userData = {
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 profilePic: user.profilePic,
//                 preferredCategories: user.preferredCategories,
//                 badges: user.badges,
//                 points: user.points,
//                 lastLogin: user.lastLogin
//             };

//             // Set HTTP-only cookie
//             res.cookie("tukkaToken", token, {
//                 expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === 'production',
//                 sameSite: 'strict'
//             });

//             console.log("Login successful for user:", user.email);

//             return res.status(200).json({
//                 success: true,
//                 message: "Login successful!",
//                 token, // Also send token in response for mobile/SPA use
//                 user: userData
//             });

//         } catch (err) {
//             console.error(`Error during login: ${err.message}`);
//             return res.status(500).json({
//                 success: false,
//                 message: "Login failed. Please try again later."
//             });
//         }
//     }
// );


app.get("/api/userProfile", authenticate, async (req, res) => {
    try {
        res.send(req.rootUser);
    } catch (err) {
        console.log(`Error during Employeee Profile Page -${err}`);
    }
});

app.get("/api/logout", authenticate, async (req, res) => {
    try {
        const modelName = req.rootUser.constructor.modelName;

        let model;

        switch (modelName) {
            case "Fortune_User":
                model = UsersDB;

                break;

            default:
                throw new Error(`Unknown model name: ${modelName}`);
        }

        await model.updateOne({ _id: req.id }, { $set: { status: "offline" } });
        res.clearCookie("cookies1", { path: "/" });
        console.log("cookies-deleted");
        res.redirect("/Login");
    } catch (err) {
        console.log(`Error During Logout - ${err}`);
    }
});


app.get("/api/usersList", async (req, res) => {
    try {
        const data = await UsersDB.find()
        // console.log(data)

        res.send(data);
    } catch (err) {
        console.log(`Error during sending users list -${err}`);
    }
});

app.put("/api/userProfile/profile", authenticate, async (req, res) => {
    try {
        const { name, username, email } = req.body;

        // Validate inputs
        if (!name || !username || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, username and email are required"
            });
        }

        // Check if username is taken by another user
        const existingUsername = await UsersDB.findOne({
            username,
            _id: { $ne: req.rootUser._id }
        });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: "Username already taken"
            });
        }

        // Check if email is taken by another user
        const existingEmail = await UsersDB.findOne({
            email: email.toLowerCase(),
            _id: { $ne: req.rootUser._id }
        });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        const updatedUser = await UsersDB.findByIdAndUpdate(
            req.rootUser._id,
            {
                name,
                username,
                email: email.toLowerCase(),
                profilePic: req.body.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            },
            { new: true, runValidators: true }
        ).select('-password -tokens');

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error(`Error updating profile: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
});

app.post("/api/userProfile/categories", authenticate, async (req, res) => {
    try {
        const { preferredCategories } = req.body;

        if (!preferredCategories || !Array.isArray(preferredCategories)) {
            return res.status(400).json({
                success: false,
                message: "Preferred categories array is required"
            });
        }

        // Filter out duplicates and invalid categories
        const validCategories = [
            "RomanticTwist", "FoodJoke", "HorrorTwist", "TechHumor",
            "BollywoodStyle", "BollywoodDialogue", "DailyQuestion",
            "Fortunes", "FriendFortune", "MummyScolding",
            "NameFortune", "SharmaJiBeta", "WhatsAppStatus"
        ];

        const newCategories = preferredCategories
            .filter(cat => validCategories.includes(cat) && !req.rootUser.preferredCategories.includes(cat));

        if (newCategories.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid new categories to add"
            });
        }

        const updatedUser = await UsersDB.findByIdAndUpdate(
            req.rootUser._id,
            { $addToSet: { preferredCategories: { $each: newCategories } } },
            { new: true }
        ).select('-password -tokens');

        res.status(200).json({
            success: true,
            message: "Categories added successfully",
            preferredCategories: updatedUser.preferredCategories
        });
    } catch (err) {
        console.error(`Error adding categories: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to add categories"
        });
    }
});

app.delete("/api/userProfile/categories/:category", authenticate, async (req, res) => {
    try {
        const { category } = req.params;

        if (!req.rootUser.preferredCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Category not found in user preferences"
            });
        }

        const updatedUser = await UsersDB.findByIdAndUpdate(
            req.rootUser._id,
            { $pull: { preferredCategories: category } },
            { new: true }
        ).select('-password -tokens');

        res.status(200).json({
            success: true,
            message: "Category removed successfully",
            preferredCategories: updatedUser.preferredCategories
        });
    } catch (err) {
        console.error(`Error removing category: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to remove category"
        });
    }
});

app.put("/api/userProfile/security", authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;


        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords don't match"
            });
        }

        // Get the full user document with password
        const user = await UsersDB.findById(req.rootUser._id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }
        // Update password
        user.password = newPassword;
        await user.save(); // This triggers the pre-save hook to hash the password

        // Optionally: Invalidate all existing tokens by clearing the tokens array
        user.tokens = [];
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });


    } catch (err) {
        console.error(`Error updating password: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to update password"
        });
    }
});

app.post('/api/newFortune', async (req, res) => {
    try {
        const {
            text,
            language,
            timeOfDay,
            city,
            weather,
            dayOfWeek,
            mood,
            festival,
            dramaType,
            loveStatus,
            mummyMood,
            statusLevel,
            tvShow,
            shoeSize,
            pocketMoney,
            phoneStyle,
            wakeUpTime,
            stomachStatus,
            isActive = true
        } = req.body;

        // Validate required fields
        if (!text || text.trim() === '') {
            return res.status(400).json({
                message: 'Fortune text is required'
            });
        }

        // Check for duplicate fortune text
        const existingFortune = await FortunesDB.findOne({ text: text.trim() });
        if (existingFortune) {
            return res.status(409).json({
                message: 'Fortune with this text already exists'
            });
        }

        // Helper function to get random option from array
        function getRandomOption(options) {
            return options[Math.floor(Math.random() * options.length)];
        }

        // Create new fortune
        const newFortune = new FortunesDB({
            text: text.trim(),
            language: timeOfDay || "hindi",
            timeOfDay: timeOfDay || getRandomOption(["morning", "afternoon", "evening", "night"]),
            city: city || getRandomOption(["mumbai", "delhi", "bangalore", "chennai", "kolkata", "other"]),
            weather: weather || getRandomOption(["sunny", "rainy", "hot", "cold"]),
            dayOfWeek: dayOfWeek || getRandomOption(["monday", "tuesday", "wednesday", "thursday", "friday", "weekend"]),
            mood: mood || getRandomOption(["funny", "roast", "motivational", "drama"]),
            festival: festival || getRandomOption(["diwali", "holi", "eid", "christmas", "none"]),
            dramaType: dramaType || getRandomOption(["saas-bahu", "roadside romeo", "office ka hero", "college cringe"]),
            loveStatus: loveStatus || getRandomOption(["single AF", "secret crush", "ghapla chal raha", "shaadi fixed"]),
            mummyMood: mummyMood || getRandomOption(["pyaar", "daant", "comparison", "khana khila rahi"]),
            statusLevel: statusLevel || getRandomOption(["amreeka return", "middle-class struggler", "village ka chhora"]),
            tvShow: tvShow || getRandomOption(["TMKOC", "KBC", "Bigg Boss", "CID"]),
            shoeSize: shoeSize || getRandomOption(["chhota (8-9)", "medium (10)", "bada (11+)", "joota hi nahi"]),
            pocketMoney: pocketMoney || getRandomOption(["zero", "10 ka chutta", "500 ka note", "card hai par balance nahi"]),
            phoneStyle: phoneStyle || getRandomOption(["one-hand", "thoda-type thoda-swipe", "dono haath", "mummy pakad ke chalati"]),
            wakeUpTime: wakeUpTime || getRandomOption(["5 baje (psycho)", "7 baje (normal)", "9 baje (late)", "shaam ko utho"]),
            stomachStatus: stomachStatus || getRandomOption(["bhookha", "thoda bhara", "food baby", "diet pe hu"]),
            isActive,
            timesServed: 0,
            shareCount: 0
        });



        const savedFortune = await newFortune.save();

        res.status(201).json({
            message: 'Fortune created successfully',
            fortune: savedFortune
        });
    } catch (error) {
        console.error('Error creating fortune:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Fortune with this text already exists'
            });
        }

        res.status(500).json({
            message: 'Failed to create fortune',
            error: error.message
        });
    }
});


app.get('/api/fortunes', async (req, res) => {
    try {
        const fortunes = await FortunesDB.find({})
            .sort({ createdAt: -1 });
        // .limit(100); // Limit to prevent large responses

        res.json(fortunes);
    } catch (error) {
        console.error('Error fetching fortunes:', error);
        res.status(500).json({
            message: 'Failed to fetch fortunes',
            error: error.message
        });
    }
});

// PUT update fortune
app.put('/api/fortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            text,
            timeOfDay,
            city,
            weather,
            dayOfWeek,
            mood,
            festival,
            dramaType,
            loveStatus,
            mummyMood,
            statusLevel,
            tvShow,
            shoeSize,
            pocketMoney,
            phoneStyle,
            wakeUpTime,
            stomachStatus,
            isActive
        } = req.body;

        // Validate required fields
        if (!text || text.trim() === '') {
            return res.status(400).json({
                message: 'Fortune text is required'
            });
        }

        // Check if fortune exists
        const existingFortune = await Fortune.findById(id);
        if (!existingFortune) {
            return res.status(404).json({
                message: 'Fortune not found'
            });
        }

        // Check for duplicate text (excluding current fortune)
        const duplicateFortune = await FortunesDB.findOne({
            text: text.trim(),
            _id: { $ne: id }
        });
        if (duplicateFortune) {
            return res.status(409).json({
                message: 'Fortune with this text already exists'
            });
        }

        // Update fortune
        const updatedFortune = await FortunesDB.findByIdAndUpdate(
            id,
            {
                text: text.trim(),
                timeOfDay: timeOfDay || undefined,
                city: city || undefined,
                weather: weather || undefined,
                dayOfWeek: dayOfWeek || undefined,
                mood: mood || undefined,
                festival: festival || undefined,
                dramaType: dramaType || undefined,
                loveStatus: loveStatus || undefined,
                mummyMood: mummyMood || undefined,
                statusLevel: statusLevel || undefined,
                tvShow: tvShow || undefined,
                shoeSize: shoeSize || undefined,
                pocketMoney: pocketMoney || undefined,
                phoneStyle: phoneStyle || undefined,
                wakeUpTime: wakeUpTime || undefined,
                stomachStatus: stomachStatus || undefined,
                isActive,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Fortune updated successfully',
            fortune: updatedFortune
        });
    } catch (error) {
        console.error('Error updating fortune:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid fortune ID'
            });
        }

        res.status(500).json({
            message: 'Failed to update fortune',
            error: error.message
        });
    }
});

// DELETE fortune (unchanged as it doesn't deal with fields)
app.delete('/api/fortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if fortune exists
        const existingFortune = await FortunesDB.findById(id);
        if (!existingFortune) {
            return res.status(404).json({
                message: 'Fortune not found'
            });
        }

        // Delete fortune
        await FortunesDB.findByIdAndDelete(id);

        res.json({
            message: 'Fortune deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting fortune:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid fortune ID'
            });
        }

        res.status(500).json({
            message: 'Failed to delete fortune',
            error: error.message
        });
    }
});

// GET single fortune by ID (unchanged as it returns all fields automatically)
app.get('/api/fortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const fortune = await FortunesDB.findById(id);
        if (!fortune) {
            return res.status(404).json({
                message: 'Fortune not found'
            });
        }

        res.json(fortune);
    } catch (error) {
        console.error('Error fetching fortune:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid fortune ID'
            });
        }

        res.status(500).json({
            message: 'Failed to fetch fortune',
            error: error.message
        });
    }
});

// GET fortunes with filtering and pagination (updated with new fields)
app.get('/api/fortunes/filter', async (req, res) => {
    try {
        const {
            timeOfDay,
            city,
            weather,
            dayOfWeek,
            mood,
            festival,
            dramaType,
            loveStatus,
            mummyMood,
            statusLevel,
            tvShow,
            shoeSize,
            pocketMoney,
            phoneStyle,
            wakeUpTime,
            stomachStatus,
            isActive,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};
        if (timeOfDay) filter.timeOfDay = timeOfDay;
        if (city) filter.city = city;
        if (weather) filter.weather = weather;
        if (dayOfWeek) filter.dayOfWeek = dayOfWeek;
        if (mood) filter.mood = mood;
        if (festival) filter.festival = festival;
        if (dramaType) filter.dramaType = dramaType;
        if (loveStatus) filter.loveStatus = loveStatus;
        if (mummyMood) filter.mummyMood = mummyMood;
        if (statusLevel) filter.statusLevel = statusLevel;
        if (tvShow) filter.tvShow = tvShow;
        if (shoeSize) filter.shoeSize = shoeSize;
        if (pocketMoney) filter.pocketMoney = pocketMoney;
        if (phoneStyle) filter.phoneStyle = phoneStyle;
        if (wakeUpTime) filter.wakeUpTime = wakeUpTime;
        if (stomachStatus) filter.stomachStatus = stomachStatus;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const fortunes = await FortunesDB.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await FortunesDB.countDocuments(filter);

        res.json({
            fortunes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error filtering fortunes:', error);
        res.status(500).json({
            message: 'Failed to filter fortunes',
            error: error.message
        });
    }
});

// PATCH update fortune statistics (unchanged as it doesn't deal with fields)
app.patch('/api/fortunes/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'served' or 'shared'

        if (!['served', 'shared'].includes(action)) {
            return res.status(400).json({
                message: 'Invalid action. Use "served" or "shared"'
            });
        }

        const updateQuery = action === 'served'
            ? { $inc: { timesServed: 1 }, $set: { lastServedAt: new Date() } }
            : { $inc: { shareCount: 1 } };

        const updatedFortune = await FortunesDB.findByIdAndUpdate(
            id,
            updateQuery,
            { new: true }
        );

        if (!updatedFortune) {
            return res.status(404).json({
                message: 'Fortune not found'
            });
        }

        res.json({
            message: `Fortune ${action} count updated`,
            fortune: updatedFortune
        });
    } catch (error) {
        console.error('Error updating fortune stats:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid fortune ID'
            });
        }

        res.status(500).json({
            message: 'Failed to update fortune stats',
            error: error.message
        });
    }
});

// GET fortune statistics (updated with new fields)
app.get('/api/fortunes/stats/overview', async (req, res) => {
    try {
        const stats = await FortunesDB.aggregate([
            {
                $group: {
                    _id: null,
                    totalFortunes: { $sum: 1 },
                    activeFortunes: { $sum: { $cond: ['$isActive', 1, 0] } },
                    totalServed: { $sum: '$timesServed' },
                    totalShared: { $sum: '$shareCount' },
                    avgTimesServed: { $avg: '$timesServed' },
                    avgShareCount: { $avg: '$shareCount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalFortunes: 1,
                    activeFortunes: 1,
                    inactiveFortunes: { $subtract: ['$totalFortunes', '$activeFortunes'] },
                    totalServed: 1,
                    totalShared: 1,
                    avgTimesServed: { $round: ['$avgTimesServed', 2] },
                    avgShareCount: { $round: ['$avgShareCount', 2] }
                }
            }
        ]);

        // Add stats for all the new fields
        const moodStats = await FortunesDB.aggregate([
            { $match: { mood: { $ne: null } } },
            { $group: { _id: '$mood', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const cityStats = await FortunesDB.aggregate([
            { $match: { city: { $ne: null } } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const dramaTypeStats = await FortunesDB.aggregate([
            { $match: { dramaType: { $ne: null } } },
            { $group: { _id: '$dramaType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const loveStatusStats = await FortunesDB.aggregate([
            { $match: { loveStatus: { $ne: null } } },
            { $group: { _id: '$loveStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const mummyMoodStats = await FortunesDB.aggregate([
            { $match: { mummyMood: { $ne: null } } },
            { $group: { _id: '$mummyMood', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            overview: stats[0] || {
                totalFortunes: 0,
                activeFortunes: 0,
                inactiveFortunes: 0,
                totalServed: 0,
                totalShared: 0,
                avgTimesServed: 0,
                avgShareCount: 0
            },
            moodDistribution: moodStats,
            cityDistribution: cityStats,
            dramaTypeDistribution: dramaTypeStats,
            loveStatusDistribution: loveStatusStats,
            mummyMoodDistribution: mummyMoodStats
        });
    } catch (error) {
        console.error('Error fetching fortune stats:', error);
        res.status(500).json({
            message: 'Failed to fetch fortune statistics',
            error: error.message
        });
    }
});


app.get('/api/bollywoodDialogues', async (req, res) => {
    try {
        const dialogues = await BollywoodDialogueDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(dialogues);
    } catch (error) {
        console.error('Error fetching dialogues:', error);
        res.status(500).json({
            error: 'Failed to fetch dialogues',
            message: error.message
        });
    }
});

// POST /api/newBollywoodDialogue - Create new dialogue
app.post('/api/newBollywoodDialogue', async (req, res) => {
    try {
        const { style, template, variables, isPopular } = req.body;

        // Validation
        if (!style || !template) {
            return res.status(400).json({
                error: 'Style and template are required'
            });
        }

        const validStyles = ['amitabh', 'rajinikanth', 'tapori', 'kareena'];
        if (!validStyles.includes(style)) {
            return res.status(400).json({
                error: 'Invalid style. Must be one of: ' + validStyles.join(', ')
            });
        }

        // Clean up variables
        const cleanVariables = {
            items: variables?.items?.filter(item => item && item.trim()) || [],
            outcomes: variables?.outcomes?.filter(outcome => outcome && outcome.trim()) || []
        };

        // Create new dialogue
        const newDialogue = new BollywoodDialogueDB({
            style,
            template: template.trim(),
            variables: cleanVariables,
            isPopular: Boolean(isPopular)
        });

        const savedDialogue = await newDialogue.save();

        res.status(201).json({
            success: true,
            message: 'Dialogue created successfully',
            data: savedDialogue
        });
    } catch (error) {
        console.error('Error creating dialogue:', error);
        res.status(500).json({
            error: 'Failed to create dialogue',
            message: error.message
        });
    }
});

// GET /api/bollywoodDialogues/:id - Get single dialogue
app.get('/api/bollywoodDialogues/:id', async (req, res) => {
    try {
        const dialogue = await BollywoodDialogueDB.findById(req.params.id);

        if (!dialogue) {
            return res.status(404).json({
                error: 'Dialogue not found'
            });
        }

        res.status(200).json(dialogue);
    } catch (error) {
        console.error('Error fetching dialogue:', error);
        res.status(500).json({
            error: 'Failed to fetch dialogue',
            message: error.message
        });
    }
});

// PUT /api/bollywoodDialogues/:id - Update dialogue
app.put('/api/bollywoodDialogues/:id', async (req, res) => {
    try {
        const { style, template, variables, isPopular } = req.body;
        const { id } = req.params;

        // Validation
        if (!style || !template) {
            return res.status(400).json({
                error: 'Style and template are required'
            });
        }

        const validStyles = ['amitabh', 'rajinikanth', 'tapori', 'kareena'];
        if (!validStyles.includes(style)) {
            return res.status(400).json({
                error: 'Invalid style. Must be one of: ' + validStyles.join(', ')
            });
        }

        // Clean up variables
        const cleanVariables = {
            items: variables?.items?.filter(item => item && item.trim()) || [],
            outcomes: variables?.outcomes?.filter(outcome => outcome && outcome.trim()) || []
        };

        // Update dialogue
        const updatedDialogue = await BollywoodDialogueDB.findByIdAndUpdate(
            id,
            {
                style,
                template: template.trim(),
                variables: cleanVariables,
                isPopular: Boolean(isPopular)
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedDialogue) {
            return res.status(404).json({
                error: 'Dialogue not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dialogue updated successfully',
            data: updatedDialogue
        });
    } catch (error) {
        console.error('Error updating dialogue:', error);
        res.status(500).json({
            error: 'Failed to update dialogue',
            message: error.message
        });
    }
});

app.get('/api/bollywoodDialogues', async (req, res) => {
    try {
        const dialogues = await BollywoodDialogueDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(dialogues);
    } catch (error) {
        console.error('Error fetching dialogues:', error);
        res.status(500).json({
            error: 'Failed to fetch dialogues',
            message: error.message
        });
    }
});

// POST /api/newBollywoodDialogue - Create new dialogue
app.post('/api/newBollywoodDialogue', async (req, res) => {
    try {
        const { style, template, variables, isPopular } = req.body;

        // Validation
        if (!style || !template) {
            return res.status(400).json({
                error: 'Style and template are required'
            });
        }

        const validStyles = ['amitabh', 'rajinikanth', 'tapori', 'kareena'];
        if (!validStyles.includes(style)) {
            return res.status(400).json({
                error: 'Invalid style. Must be one of: ' + validStyles.join(', ')
            });
        }

        // Clean up variables
        const cleanVariables = {
            items: variables?.items?.filter(item => item && item.trim()) || [],
            outcomes: variables?.outcomes?.filter(outcome => outcome && outcome.trim()) || []
        };

        // Create new dialogue
        const newDialogue = new BollywoodDialogueDB({
            style,
            template: template.trim(),
            variables: cleanVariables,
            isPopular: Boolean(isPopular)
        });

        const savedDialogue = await newDialogue.save();

        res.status(201).json({
            success: true,
            message: 'Dialogue created successfully',
            data: savedDialogue
        });
    } catch (error) {
        console.error('Error creating dialogue:', error);
        res.status(500).json({
            error: 'Failed to create dialogue',
            message: error.message
        });
    }
});

// GET /api/bollywoodDialogues/:id - Get single dialogue
app.get('/api/bollywoodDialogues/:id', async (req, res) => {
    try {
        const dialogue = await BollywoodDialogueDB.findById(req.params.id);

        if (!dialogue) {
            return res.status(404).json({
                error: 'Dialogue not found'
            });
        }

        res.status(200).json(dialogue);
    } catch (error) {
        console.error('Error fetching dialogue:', error);
        res.status(500).json({
            error: 'Failed to fetch dialogue',
            message: error.message
        });
    }
});

// PUT /api/bollywoodDialogues/:id - Update dialogue
app.put('/api/bollywoodDialogues/:id', async (req, res) => {
    try {
        const { style, template, variables, isPopular } = req.body;
        const { id } = req.params;

        // Validation
        if (!style || !template) {
            return res.status(400).json({
                error: 'Style and template are required'
            });
        }

        const validStyles = ['amitabh', 'rajinikanth', 'tapori', 'kareena'];
        if (!validStyles.includes(style)) {
            return res.status(400).json({
                error: 'Invalid style. Must be one of: ' + validStyles.join(', ')
            });
        }

        // Clean up variables
        const cleanVariables = {
            items: variables?.items?.filter(item => item && item.trim()) || [],
            outcomes: variables?.outcomes?.filter(outcome => outcome && outcome.trim()) || []
        };

        // Update dialogue
        const updatedDialogue = await BollywoodDialogueDB.findByIdAndUpdate(
            id,
            {
                style,
                template: template.trim(),
                variables: cleanVariables,
                isPopular: Boolean(isPopular)
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedDialogue) {
            return res.status(404).json({
                error: 'Dialogue not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dialogue updated successfully',
            data: updatedDialogue
        });
    } catch (error) {
        console.error('Error updating dialogue:', error);
        res.status(500).json({
            error: 'Failed to update dialogue',
            message: error.message
        });
    }
});

// DELETE /api/bollywoodDialogues/:id - Delete dialogue
app.delete('/api/bollywoodDialogues/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // HARD DELETE (completely remove from DB)
        const deletedDialogue = await BollywoodDialogueDB.findByIdAndDelete(id);

        if (!deletedDialogue) {
            return res.status(404).json({
                error: 'Dialogue not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dialogue permanently deleted',
            data: deletedDialogue
        });
    } catch (error) {
        console.error('Error deleting dialogue:', error);
        res.status(500).json({
            error: 'Failed to delete dialogue',
            message: error.message
        });
    }
});

// GET - Fetch all daily questions
app.get('/api/dailyQuestions', async (req, res) => {
    try {
        const questions = await DailyQuestionsDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(questions);
    } catch (error) {
        console.error('Error fetching daily questions:', error);
        res.status(500).json({
            error: 'Failed to fetch daily questions',
            message: error.message
        });
    }
});

// POST - Create new daily question
app.post('/api/newDailyQuestions', async (req, res) => {
    try {
        const { question, language, isActive } = req.body;

        // Validation
        if (!question || !question.trim()) {
            return res.status(400).json({
                error: 'Question is required',
                message: 'Question field cannot be empty'
            });
        }

        if (!language || !['hindi', 'english', 'hinglish'].includes(language)) {
            return res.status(400).json({
                error: 'Invalid language',
                message: 'Language must be one of: hindi, english, hinglish'
            });
        }

        // Check if question already exists
        const existingQuestion = await DailyQuestionsDB.findOne({
            question: question.trim()
        });

        if (existingQuestion) {
            return res.status(409).json({
                error: 'Question already exists',
                message: 'A question with this content already exists'
            });
        }

        // Create new question
        const newQuestion = new DailyQuestionsDB({
            question: question.trim(),
            language: language || 'hinglish',
            isActive: isActive !== undefined ? isActive : true,
            options: {
                yes: 0,
                no: 0,
                maybe: 0
            }
        });

        const savedQuestion = await newQuestion.save();

        res.status(201).json({
            message: 'Daily question created successfully',
            question: savedQuestion
        });

    } catch (error) {
        console.error('Error creating daily question:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Question already exists',
                message: 'A question with this content already exists'
            });
        }

        res.status(500).json({
            error: 'Failed to create daily question',
            message: error.message
        });
    }
});

// PUT - Update existing daily question
app.put('/api/dailyQuestions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { question, language, isActive, options } = req.body;

        // Validation
        if (!question || !question.trim()) {
            return res.status(400).json({
                error: 'Question is required',
                message: 'Question field cannot be empty'
            });
        }

        if (!language || !['hindi', 'english', 'hinglish'].includes(language)) {
            return res.status(400).json({
                error: 'Invalid language',
                message: 'Language must be one of: hindi, english, hinglish'
            });
        }

        // Check if question exists
        const existingQuestion = await DailyQuestionsDB.findById(id);
        if (!existingQuestion) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'Daily question with this ID does not exist'
            });
        }

        // Check if updated question content conflicts with another question
        const duplicateQuestion = await DailyQuestionsDB.findOne({
            question: question.trim(),
            _id: { $ne: id }
        });

        if (duplicateQuestion) {
            return res.status(409).json({
                error: 'Question already exists',
                message: 'Another question with this content already exists'
            });
        }

        // Update question
        const updatedQuestion = await DailyQuestionsDB.findByIdAndUpdate(
            id,
            {
                question: question.trim(),
                language: language,
                isActive: isActive !== undefined ? isActive : existingQuestion.isActive,
                options: options || existingQuestion.options
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Daily question updated successfully',
            question: updatedQuestion
        });

    } catch (error) {
        console.error('Error updating daily question:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Question already exists',
                message: 'A question with this content already exists'
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid question ID',
                message: 'Please provide a valid question ID'
            });
        }

        res.status(500).json({
            error: 'Failed to update daily question',
            message: error.message
        });
    }
});

// DELETE - Delete daily question
app.delete('/api/dailyQuestions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if question exists
        const existingQuestion = await DailyQuestionsDB.findById(id);
        if (!existingQuestion) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'Daily question with this ID does not exist'
            });
        }

        // Delete the question
        await DailyQuestionsDB.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Daily question deleted successfully',
            deletedQuestion: existingQuestion
        });

    } catch (error) {
        console.error('Error deleting daily question:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid question ID',
                message: 'Please provide a valid question ID'
            });
        }

        res.status(500).json({
            error: 'Failed to delete daily question',
            message: error.message
        });
    }
});

// GET - Fetch single daily question by ID
app.get('/api/dailyQuestions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const question = await DailyQuestionsDB.findById(id);

        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'Daily question with this ID does not exist'
            });
        }

        res.status(200).json(question);

    } catch (error) {
        console.error('Error fetching daily question:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid question ID',
                message: 'Please provide a valid question ID'
            });
        }

        res.status(500).json({
            error: 'Failed to fetch daily question',
            message: error.message
        });
    }
});

// GET - Fetch active daily questions only
app.get('/api/dailyQuestions/active', async (req, res) => {
    try {
        const activeQuestions = await DailyQuestionsDB.find({ isActive: true })
            .sort({ createdAt: -1 });

        res.status(200).json(activeQuestions);
    } catch (error) {
        console.error('Error fetching active daily questions:', error);
        res.status(500).json({
            error: 'Failed to fetch active daily questions',
            message: error.message
        });
    }
});

// GET - Fetch questions by language
app.get('/api/dailyQuestions/language/:lang', async (req, res) => {
    try {
        const { lang } = req.params;

        if (!['hindi', 'english', 'hinglish'].includes(lang)) {
            return res.status(400).json({
                error: 'Invalid language',
                message: 'Language must be one of: hindi, english, hinglish'
            });
        }

        const questions = await DailyQuestionsDB.find({ language: lang })
            .sort({ createdAt: -1 });

        res.status(200).json(questions);
    } catch (error) {
        console.error('Error fetching questions by language:', error);
        res.status(500).json({
            error: 'Failed to fetch questions by language',
            message: error.message
        });
    }
});

// PATCH - Update question response counts (for voting)
app.patch('/api/dailyQuestions/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body;

        if (!['yes', 'no', 'maybe'].includes(voteType)) {
            return res.status(400).json({
                error: 'Invalid vote type',
                message: 'Vote type must be one of: yes, no, maybe'
            });
        }

        const question = await DailyQuestionsDB.findById(id);
        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'Daily question with this ID does not exist'
            });
        }

        if (!question.isActive) {
            return res.status(400).json({
                error: 'Question is inactive',
                message: 'Cannot vote on inactive questions'
            });
        }

        // Increment the vote count
        const updateField = `options.${voteType}`;
        const updatedQuestion = await DailyQuestionsDB.findByIdAndUpdate(
            id,
            { $inc: { [updateField]: 1 } },
            { new: true }
        );

        res.status(200).json({
            message: 'Vote recorded successfully',
            question: updatedQuestion
        });

    } catch (error) {
        console.error('Error recording vote:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid question ID',
                message: 'Please provide a valid question ID'
            });
        }

        res.status(500).json({
            error: 'Failed to record vote',
            message: error.message
        });
    }
});

// PATCH - Toggle active status
app.patch('/api/dailyQuestions/:id/toggle-active', async (req, res) => {
    try {
        const { id } = req.params;

        const question = await DailyQuestionsDB.findById(id);
        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'Daily question with this ID does not exist'
            });
        }

        const updatedQuestion = await DailyQuestionsDB.findByIdAndUpdate(
            id,
            { isActive: !question.isActive },
            { new: true }
        );

        res.status(200).json({
            message: `Question ${updatedQuestion.isActive ? 'activated' : 'deactivated'} successfully`,
            question: updatedQuestion
        });

    } catch (error) {
        console.error('Error toggling question status:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid question ID',
                message: 'Please provide a valid question ID'
            });
        }

        res.status(500).json({
            error: 'Failed to toggle question status',
            message: error.message
        });
    }
});




// GET - Fetch all friend fortunes
app.get('/api/friendFortunes', async (req, res) => {
    try {
        const fortunes = await FriendFortuneDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(fortunes);
    } catch (error) {
        console.error('Error fetching friend fortunes:', error);
        res.status(500).json({
            error: 'Failed to fetch friend fortunes',
            message: error.message
        });
    }
});

// POST - Create new friend fortune
app.post('/api/newFriendFortune', async (req, res) => {
    try {
        const {
            language,
            // relation,
            prediction, 
            roastLevel, shareCount
         } = req.body;
        console.log(req.body)


        // Validation
        if (
            // !relation || 
            !prediction) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Relation and prediction are required'
            });
        }

        // Validate roastLevel enum
        const validRoastLevels = ['friendly', 'savage', 'deadly'];
        if (roastLevel && !validRoastLevels.includes(roastLevel)) {
            return res.status(400).json({
                error: 'Invalid roast level',
                message: 'Roast level must be one of: friendly, savage, deadly'
            });
        }

        const newFortune = new FriendFortuneDB({
            // relation,
            prediction,
            language,
            roastLevel: roastLevel || 'friendly',
            shareCount: shareCount || 0
        });

        const savedFortune = await newFortune.save();

        res.status(201).json({
            message: 'Friend fortune created successfully',
            fortune: savedFortune
        });



        const updatedFortune = await FriendFortuneDB.findByIdAndUpdate(
            id,
            {
                // relation,
                prediction,
                language,
                roastLevel: roastLevel || 'friendly',
                shareCount: shareCount || 0
            },
            { new: true, runValidators: true }
        );

        if (!updatedFortune) {
            return res.status(404).json({
                error: 'Friend fortune not found',
                message: 'No friend fortune found with the provided ID'
            });
        }

        res.status(200).json({
            message: 'Friend fortune updated successfully',
            fortune: updatedFortune
        });
    } catch (error) {
        console.error('Error updating friend fortune:', error);
        res.status(500).json({
            error: 'Failed to update friend fortune',
            message: error.message
        });
    }
});

// DELETE - Delete friend fortune
app.delete('/api/friendFortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deletedFortune = await FriendFortuneDB.findByIdAndDelete(id);

        if (!deletedFortune) {
            return res.status(404).json({
                error: 'Friend fortune not found',
                message: 'No friend fortune found with the provided ID'
            });
        }

        res.status(200).json({
            message: 'Friend fortune deleted successfully',
            fortune: deletedFortune
        });
    } catch (error) {
        console.error('Error deleting friend fortune:', error);
        res.status(500).json({
            error: 'Failed to delete friend fortune',
            message: error.message
        });
    }
});

// GET - Fetch single friend fortune by ID
app.get('/api/friendFortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fortune = await FriendFortuneDB.findById(id);

        if (!fortune) {
            return res.status(404).json({
                error: 'Friend fortune not found',
                message: 'No friend fortune found with the provided ID'
            });
        }

        res.status(200).json(fortune);
    } catch (error) {
        console.error('Error fetching friend fortune:', error);
        res.status(500).json({
            error: 'Failed to fetch friend fortune',
            message: error.message
        });
    }
});

// GET - Fetch friend fortunes by relation
app.get('/api/friendFortunes/relation/:relation', async (req, res) => {
    try {
        const { relation } = req.params;
        const fortunes = await FriendFortuneDB.find({ relation })
            .sort({ createdAt: -1 });

        res.status(200).json(fortunes);
    } catch (error) {
        console.error('Error fetching friend fortunes by relation:', error);
        res.status(500).json({
            error: 'Failed to fetch friend fortunes by relation',
            message: error.message
        });
    }
});

// GET - Fetch friend fortunes by roast level
app.get('/api/friendFortunes/roastLevel/:roastLevel', async (req, res) => {
    try {
        const { roastLevel } = req.params;
        const validRoastLevels = ['friendly', 'savage', 'deadly'];

        if (!validRoastLevels.includes(roastLevel)) {
            return res.status(400).json({
                error: 'Invalid roast level',
                message: 'Roast level must be one of: friendly, savage, deadly'
            });
        }

        const fortunes = await FriendFortuneDB.find({ roastLevel })
            .sort({ createdAt: -1 });

        res.status(200).json(fortunes);
    } catch (error) {
        console.error('Error fetching friend fortunes by roast level:', error);
        res.status(500).json({
            error: 'Failed to fetch friend fortunes by roast level',
            message: error.message
        });
    }
});

// PUT - Update share count for a fortune
app.put('/api/friendFortunes/:id/share', async (req, res) => {
    try {
        const { id } = req.params;

        const fortune = await FriendFortuneDB.findByIdAndUpdate(
            id,
            { $inc: { shareCount: 1 } },
            { new: true }
        );

        if (!fortune) {
            return res.status(404).json({
                error: 'Friend fortune not found',
                message: 'No friend fortune found with the provided ID'
            });
        }

        res.status(200).json({
            message: 'Share count updated successfully',
            fortune
        });
    } catch (error) {
        console.error('Error updating share count:', error);
        res.status(500).json({
            error: 'Failed to update share count',
            message: error.message
        });
    }
});

// GET - Get statistics about friend fortunes
app.get('/api/friendFortunes/stats/overview', async (req, res) => {
    try {
        const totalCount = await FriendFortuneDB.countDocuments();
        const relationStats = await FriendFortuneDB.aggregate([
            { $group: { _id: '$relation', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const roastLevelStats = await FriendFortuneDB.aggregate([
            { $group: { _id: '$roastLevel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const totalShares = await FriendFortuneDB.aggregate([
            { $group: { _id: null, total: { $sum: '$shareCount' } } }
        ]);

        res.status(200).json({
            totalCount,
            relationStats,
            roastLevelStats,
            totalShares: totalShares[0]?.total || 0
        });
    } catch (error) {
        console.error('Error fetching friend fortune stats:', error);
        res.status(500).json({
            error: 'Failed to fetch friend fortune stats',
            message: error.message
        });
    }
});

app.put('/api/friendFortunes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { relation, prediction, roastLevel, shareCount } = req.body;

        const updatedFortune = await FriendFortuneDB.findByIdAndUpdate(
            id,
            {
                relation,
                prediction,
                roastLevel: roastLevel || 'friendly',
                shareCount: shareCount || 0
            },
            { new: true, runValidators: true }
        );

        if (!updatedFortune) {
            return res.status(404).json({
                error: 'Friend fortune not found',
                message: 'No friend fortune found with the provided ID'
            });
        }

        res.status(200).json({
            message: 'Friend fortune updated successfully',
            fortune: updatedFortune
        });
    } catch (error) {
        console.error('Error updating friend fortune:', error);
        res.status(500).json({
            error: 'Failed to update friend fortune',
            message: error.message
        });
    }
});

// GET - Fetch all mummy scoldings
app.get('/api/mummyScoldings', async (req, res) => {
    try {
        const scoldings = await MummyScoldingDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(scoldings);
    } catch (error) {
        console.error('Error fetching mummy scoldings:', error);
        res.status(500).json({
            error: 'Failed to fetch mummy scoldings',
            message: error.message
        });
    }
});

// POST - Create new mummy scolding
app.post('/api/newMummyScolding', async (req, res) => {
    try {
        const { context, scolding, severity, regionalVariations } = req.body;

        // Validation
        if (!context || !context.trim()) {
            return res.status(400).json({
                error: 'Context is required',
                message: 'Please provide a scolding context'
            });
        }

        if (!scolding || !scolding.trim()) {
            return res.status(400).json({
                error: 'Scolding content is required',
                message: 'Please provide scolding content'
            });
        }

        if (severity && (severity < 1 || severity > 5)) {
            return res.status(400).json({
                error: 'Invalid severity level',
                message: 'Severity must be between 1 and 5'
            });
        }

        // Create new mummy scolding
        const newScolding = new MummyScoldingDB({
            context: context.trim(),
            scolding: scolding.trim(),
            severity: severity || 3,
            regionalVariations: regionalVariations || []
        });

        const savedScolding = await newScolding.save();

        res.status(201).json({
            message: 'Mummy scolding created successfully',
            scolding: savedScolding
        });
    } catch (error) {
        console.error('Error creating mummy scolding:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Failed to create mummy scolding',
            message: error.message
        });
    }
});

// PUT - Update existing mummy scolding
app.put('/api/mummyScoldings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { context, scolding, severity, regionalVariations } = req.body;

        // Validation
        if (!context || !context.trim()) {
            return res.status(400).json({
                error: 'Context is required',
                message: 'Please provide a scolding context'
            });
        }

        if (!scolding || !scolding.trim()) {
            return res.status(400).json({
                error: 'Scolding content is required',
                message: 'Please provide scolding content'
            });
        }

        if (severity && (severity < 1 || severity > 5)) {
            return res.status(400).json({
                error: 'Invalid severity level',
                message: 'Severity must be between 1 and 5'
            });
        }

        // Find and update the scolding
        const updatedScolding = await MummyScoldingDB.findByIdAndUpdate(
            id,
            {
                context: context.trim(),
                scolding: scolding.trim(),
                severity: severity || 3,
                regionalVariations: regionalVariations || []
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedScolding) {
            return res.status(404).json({
                error: 'Mummy scolding not found',
                message: 'The requested scolding does not exist'
            });
        }

        res.status(200).json({
            message: 'Mummy scolding updated successfully',
            scolding: updatedScolding
        });
    } catch (error) {
        console.error('Error updating mummy scolding:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Please provide a valid scolding ID'
            });
        }

        res.status(500).json({
            error: 'Failed to update mummy scolding',
            message: error.message
        });
    }
});

// DELETE - Delete mummy scolding
app.delete('/api/mummyScoldings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deletedScolding = await MummyScoldingDB.findByIdAndDelete(id);

        if (!deletedScolding) {
            return res.status(404).json({
                error: 'Mummy scolding not found',
                message: 'The requested scolding does not exist'
            });
        }

        res.status(200).json({
            message: 'Mummy scolding deleted successfully',
            scolding: deletedScolding
        });
    } catch (error) {
        console.error('Error deleting mummy scolding:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Please provide a valid scolding ID'
            });
        }

        res.status(500).json({
            error: 'Failed to delete mummy scolding',
            message: error.message
        });
    }
});

// GET - Fetch single mummy scolding by ID
app.get('/api/mummyScoldings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const scolding = await MummyScoldingDB.findById(id);

        if (!scolding) {
            return res.status(404).json({
                error: 'Mummy scolding not found',
                message: 'The requested scolding does not exist'
            });
        }

        res.status(200).json(scolding);
    } catch (error) {
        console.error('Error fetching mummy scolding:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'Please provide a valid scolding ID'
            });
        }

        res.status(500).json({
            error: 'Failed to fetch mummy scolding',
            message: error.message
        });
    }
});

// GET - Fetch mummy scoldings by context
app.get('/api/mummyScoldings/context/:context', async (req, res) => {
    try {
        const { context } = req.params;

        const scoldings = await MummyScoldingDB.find({ context })
            .sort({ createdAt: -1 });

        res.status(200).json(scoldings);
    } catch (error) {
        console.error('Error fetching mummy scoldings by context:', error);
        res.status(500).json({
            error: 'Failed to fetch mummy scoldings by context',
            message: error.message
        });
    }
});

// GET - Fetch mummy scoldings by severity
app.get('/api/mummyScoldings/severity/:severity', async (req, res) => {
    try {
        const { severity } = req.params;
        const severityNum = parseInt(severity);

        if (isNaN(severityNum) || severityNum < 1 || severityNum > 5) {
            return res.status(400).json({
                error: 'Invalid severity level',
                message: 'Severity must be between 1 and 5'
            });
        }

        const scoldings = await MummyScoldingDB.find({ severity: severityNum })
            .sort({ createdAt: -1 });

        res.status(200).json(scoldings);
    } catch (error) {
        console.error('Error fetching mummy scoldings by severity:', error);
        res.status(500).json({
            error: 'Failed to fetch mummy scoldings by severity',
            message: error.message
        });
    }
});

// GET - Get random mummy scolding
app.get('/api/mummyScoldings/random', async (req, res) => {
    try {
        const { context, severity } = req.query;

        // Build filter object
        const filter = {};
        if (context) filter.context = context;
        if (severity) {
            const severityNum = parseInt(severity);
            if (!isNaN(severityNum) && severityNum >= 1 && severityNum <= 5) {
                filter.severity = severityNum;
            }
        }

        const scoldings = await MummyScoldingDB.find(filter);

        if (scoldings.length === 0) {
            return res.status(404).json({
                error: 'No mummy scoldings found',
                message: 'No scoldings match the specified criteria'
            });
        }

        const randomIndex = Math.floor(Math.random() * scoldings.length);
        const randomScolding = scoldings[randomIndex];

        res.status(200).json(randomScolding);
    } catch (error) {
        console.error('Error fetching random mummy scolding:', error);
        res.status(500).json({
            error: 'Failed to fetch random mummy scolding',
            message: error.message
        });
    }
});

// GET - Get mummy scoldings statistics
app.get('/api/mummyScoldings/stats', async (req, res) => {
    try {
        const totalScoldings = await MummyScoldingDB.countDocuments();

        const contextStats = await MummyScoldingDB.aggregate([
            { $group: { _id: '$context', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const severityStats = await MummyScoldingDB.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const avgSeverity = await MummyScoldingDB.aggregate([
            { $group: { _id: null, avgSeverity: { $avg: '$severity' } } }
        ]);

        res.status(200).json({
            totalScoldings,
            contextStats,
            severityStats,
            averageSeverity: avgSeverity[0]?.avgSeverity || 0
        });
    } catch (error) {
        console.error('Error fetching mummy scoldings statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});



app.get('/api/sharmaJiComparisons', async (req, res) => {
    try {
        const comparisons = await SharmaJiBetaDB.find()
            .sort({ createdAt: -1 });

        res.status(200).json(comparisons);
    } catch (error) {
        console.error('Error fetching comparisons:', error);
        res.status(500).json({
            error: 'Failed to fetch comparisons',
            message: error.message
        });
    }
});

app.post('/api/newSharmaJiComparison', async (req, res) => {
    try {
        const { achievement, insult, intensity } = req.body;

        // Validation
        if (!achievement || !insult) {
            return res.status(400).json({
                error: 'Achievement and insult are required'
            });
        }

        // Validate intensity enum
        const validIntensities = ['mild', 'medium', 'savage'];
        if (intensity && !validIntensities.includes(intensity)) {
            return res.status(400).json({
                error: 'Invalid intensity level',
                message: 'Intensity must be one of: mild, medium, savage'
            });
        }

        const newComparison = new SharmaJiBetaDB({
            achievement,
            insult,
            intensity: intensity || 'medium'
        });

        const savedComparison = await newComparison.save();

        res.status(201).json({
            message: 'Comparison created successfully',
            comparison: savedComparison
        });
    } catch (error) {
        console.error('Error creating comparison:', error);
        res.status(500).json({
            error: 'Failed to create comparison',
            message: error.message
        });
    }
});

app.get('/api/sharmaJiComparisons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const comparison = await SharmaJiBetaDB.findById(id);

        if (!comparison) {
            return res.status(404).json({
                error: 'Comparison not found'
            });
        }

        res.status(200).json(comparison);
    } catch (error) {
        console.error('Error fetching comparison:', error);
        res.status(500).json({
            error: 'Failed to fetch comparison',
            message: error.message
        });
    }
});

app.put('/api/sharmaJiComparisons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { achievement, insult, intensity } = req.body;

        const updatedComparison = await SharmaJiBetaDB.findByIdAndUpdate(
            id,
            {
                achievement,
                insult,
                intensity: intensity || 'medium'
            },
            { new: true, runValidators: true }
        );

        if (!updatedComparison) {
            return res.status(404).json({
                error: 'Comparison not found'
            });
        }

        res.status(200).json({
            message: 'Comparison updated successfully',
            comparison: updatedComparison
        });
    } catch (error) {
        console.error('Error updating comparison:', error);
        res.status(500).json({
            error: 'Failed to update comparison',
            message: error.message
        });
    }
});

app.delete('/api/sharmaJiComparisons/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deletedComparison = await SharmaJiBetaDB.findByIdAndDelete(id);

        if (!deletedComparison) {
            return res.status(404).json({
                error: 'Comparison not found'
            });
        }

        res.status(200).json({
            message: 'Comparison deleted successfully',
            comparison: deletedComparison
        });
    } catch (error) {
        console.error('Error deleting comparison:', error);
        res.status(500).json({
            error: 'Failed to delete comparison',
            message: error.message
        });
    }
});

app.get('/api/sharmaJiComparisons/intensity/:level', async (req, res) => {
    try {
        const { level } = req.params;
        const validLevels = ['mild', 'medium', 'savage'];

        if (!validLevels.includes(level)) {
            return res.status(400).json({
                error: 'Invalid intensity level'
            });
        }

        const comparisons = await SharmaJiBetaDB.find({ intensity: level })
            .sort({ createdAt: -1 });

        res.status(200).json(comparisons);
    } catch (error) {
        console.error('Error fetching comparisons by intensity:', error);
        res.status(500).json({
            error: 'Failed to fetch comparisons',
            message: error.message
        });
    }
});

app.get('/api/sharmaJiComparisons/stats', async (req, res) => {
    try {
        const totalCount = await SharmaJiBetaDB.countDocuments();
        const intensityStats = await SharmaJiBetaDB.aggregate([
            { $group: { _id: '$intensity', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            totalCount,
            intensityStats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            error: 'Failed to fetch stats',
            message: error.message
        });
    }
});









app.get("/api/uptime", async (req, res) => {
    const uptime = os.uptime();
    const uptimeString = moment.duration(uptime, "seconds").humanize();
    console.log(uptimeString);

    res.json({ uptime: uptimeString });
});

app.get("/api/system-status", async (req, res) => {
    try {
        const systemInfo = await si.system();
        const cpuInfo = await si.cpu();
        const memInfo = await si.mem();
        const diskLayout = await si.diskLayout();
        const networkInfo = await si.networkStats();

        const diskInfo = diskLayout.reduce(
            (acc, disk) => {
                if (typeof disk.size === "number") {
                    acc.total += disk.size;

                    acc.available += 0; // or some other default value
                }

                return acc;
            },
            { total: 0, available: 0 }
        );

        const diskUsed = diskInfo.total - diskInfo.available;

        const systemStatus = {
            system: {
                os: systemInfo.os,
                platform: systemInfo.platform,
                arch: systemInfo.arch,
                uptime: os.uptime(),
            },

            cpu: {
                manufacturer: cpuInfo.manufacturer,
                brand: cpuInfo.brand,
                model: cpuInfo.model,
                cores: cpuInfo.cores,
                speed: cpuInfo.speed,
                usage: cpuInfo.usage,
            },

            os: {
                platform: os.platform(),

                arch: os.arch(),

                release: os.release(),

                type: os.type(),

                hostname: os.hostname(),
            },

            memory: {
                total: memInfo.total,
                used: memInfo.used,
                active: memInfo.active,
                available: memInfo.available,
            },

            disk: {
                total: (diskInfo.total / 1024 / 1024 / 1024).toFixed(2) + " GB",

                used: (diskUsed / 1024 / 1024 / 1024).toFixed(2) + " GB",

                available: (diskInfo.available / 1024 / 1024 / 1024).toFixed(2) + " GB",
            },

            network: {
                rx: networkInfo[0].rx,
                tx: networkInfo[0].tx,
            },
        };
        console.log(systemStatus);

        res.json(systemStatus);

    } catch (error) {

        console.error(error);

        res.status(500).json({ error: "Failed to retrieve system status" });
    }
});

let isConnected = false;

mongoose.connection.once("open", () => {

    isConnected = true;

});

app.get("/api/db-status", (req, res) => {
    if (isConnected) {
        res.status(200).json({ message: "Connected" });
    } else {
        res.status(500).json({ message: "Not Connected" });
    }
});

app.get("/api/response-time", (req, res) => {
    const startTime = Date.now();

    // Simulate some work or database query

    setTimeout(() => {
        const endTime = Date.now();

        const responseTime = endTime - startTime;

        res.json({ responseTime: `${responseTime}ms` });
    }, 2000); // simulate 2 seconds of work
});



app.listen(PORT, () => {
    console.log("Server is running on : ", PORT);
});

