const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    maxlength: 250
  }
  ,
  userType: {
    type: String,
    default: "User",
  },
  timezone: {
    type: String
  },


  otp: {
    type: String
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email`,
    },
  },


  profilePic: {
    type: String,
    default: "https://tukkatime.com/default.jpg",
  },
  avatar: {
    url: String,
    publicId: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
    isBlocked: {
    type: Boolean,
    default: false
  },
  lastPasswordChange: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  accountLockedUntil: Date,

  // Preferences (for fortune personalization)
  preferredCategories: {
    type: [String],
    enum: [
      "RomanticTwist",
      "FoodJoke",
      "HorrorTwist",
      "TechHumor",
      "BollywoodStyle",
      "BollywoodDialogue",
      "DailyQuestion",
      "Fortunes",
      "FriendFortune",
      "MummyScolding",
      "NameFortune",
      "SharmaJiBeta",
      "WhatsAppStatus",
    ],
    default: [],
  },
  dislikedCategories: {
    type: [String],
    default: [],
  },

  // ========== SOCIAL & PLATFORM INTEGRATIONS ==========
  integrations: {
    // Traditional Social
    facebook: {
      pageId: String,
      pageName: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    instagram: {
      username: String,
      businessId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    twitter: {
      userId: String,
      username: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    linkedin: {
      companyId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },

    // Emerging Platforms
    tiktok: {
      username: String,
      businessId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    whatsapp: {
      businessId: String,
      connected: Boolean,
      lastSynced: Date
    },
    telegram: {
      botToken: String,
      connected: Boolean
    },
    discord: {
      serverId: String,
      connected: Boolean
    },

    // E-commerce & Marketplaces
    shopify: {
      storeName: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    woocommerce: {
      storeUrl: String,
      consumerKey: String,
      consumerSecret: String,
      connected: Boolean,
      lastSynced: Date
    },
    amazonSeller: {
      sellerId: String,
      connected: Boolean
    },

    // Advertising Platforms
    googleAds: {
      customerId: String,
      refreshToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    metaAds: {
      adAccountId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    tiktokAds: {
      adAccountId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },

    // Analytics & SEO
    googleAnalytics: {
      propertyId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    googleSearchConsole: {
      siteUrl: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    googleMyBusiness: {
      locationId: String,
      connected: Boolean
    },

    // Email Marketing
    mailchimp: {
      accountId: String,
      apiKey: String,
      connected: Boolean,
      lastSynced: Date
    },
    klaviyo: {
      accountId: String,
      apiKey: String,
      connected: Boolean,
      lastSynced: Date
    },

    // CRM
    hubspot: {
      portalId: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },
    salesforce: {
      instanceUrl: String,
      accessToken: String,
      connected: Boolean,
      lastSynced: Date
    },

    // Other Tools
    zapier: {
      apiKey: String,
      connected: Boolean
    },
    slack: {
      teamId: String,
      accessToken: String,
      connected: Boolean
    }
  },

  // Activity Tracking
  lastLogin: Date,
  loginHistory: [
    {
      ipAddress: String,
      device: String,
      timestamp: Date,
    },
  ],
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],

  // Gamification
  points: {
    type: Number,
    default: 0,
  },
  badges: {
    type: [String],
    default: ["Newbie"],
  },


}, { timestamps: true });

// Password encryption before saving
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// JWT Token generation
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id }, process.env.SECRET_KEY, {
    expiresIn: "30d",
  });
};

// Password comparison method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model(`${process.env.APP_NAME}_User`, UserSchema);