// 1. This Firebase Stripe function is converted from Yihua's Netlify Stripe function.
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const express = require("express");
const cors = require("cors");
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const stripe = require("stripe")(
  // Removed: stripe API key
);

// Initialise express app
const app = express();

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// API route
app.post("/", async (request, response) => {
  const { amount } = request.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "sgd",
    payment_method_types: ["card"],
  });

  // Request created
  response.status(201).send({
    paymentIntent: paymentIntent,
  });
});

// Listen command
exports.createPaymentIntent = functions.region('asia-southeast1').https.onRequest(app);

// Gmail OAuth2 Configuration
const gmailClientId = functions.config().gmail.client_id;
const gmailClientSecret = functions.config().gmail.client_secret;
const gmailRefreshToken = functions.config().gmail.refresh_token;
const gmailRedirectUri = 'https://xxx.cloudfunctions.net/xxx'; // Removed: cloud function endpoint

const gmailEmail = functions.config().gmail.email;

const oauth2Client = new google.auth.OAuth2(gmailClientId, gmailClientSecret, gmailRedirectUri);

// Set the token to the OAuth2 client
oauth2Client.setCredentials({
  refresh_token: gmailRefreshToken,
});

// Initialise express app
const emailApp = express();

// Middlewares
emailApp.use(cors({ origin: true }));
emailApp.use(express.json());

emailApp.post("/", async (request, response) => {
  const { name, email, phoneNumber, message } = request.body;

  const accessToken = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailEmail,
      clientId: gmailClientId,
      clientSecret: gmailClientSecret,
      refreshToken: gmailRefreshToken,
      accessToken: accessToken,
    }
  });

  const mailOptions = {
    from: gmailEmail,
    to: [], // Removed: emails
    subject: 'contact form',
    text: `Name: ${name}\nEmail: ${email}\nPhone Number: ${phoneNumber}\nMessage: ${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    response.status(201).send({
      success: true,
    });
  } catch (error) {
    functions.logger.info(error.message, { structuredData: true });
    return { success: false, error: error.message };
  }
});

exports.emailContactForm = functions.region('asia-southeast1').https.onRequest(emailApp);
