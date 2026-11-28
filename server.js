require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

// 1. Get Access Token
const getAccessToken = async () => {
    console.log("🔑 Requesting Access Token...");
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
    
    try {
        const response = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
        console.log("✅ Access Token Received!");
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Failed to get Access Token:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// 2. Initiate STK Push
app.post('/api/stkpush', async (req, res) => {
    try {
        const { phone, amount } = req.body;
        console.log(`\n📱 New Order: Phone: ${phone}, Amount: KSh ${amount}`);
        
        const token = await getAccessToken();
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${process.env.BUSINESS_SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString("base64");

        const requestBody = {
            BusinessShortCode: process.env.BUSINESS_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: process.env.BUSINESS_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: "MapishiYetu",
            TransactionDesc: "Food Order"
        };

        console.log("🚀 Sending STK Push...");
        const response = await axios.post(url, requestBody, { headers: { Authorization: `Bearer ${token}` } });

        console.log("\n✅ Safaricom Response:", response.data);
        res.json(response.data);

    } catch (error) {
        console.error("\n❌ STK Push Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Payment failed to initiate" });
    }
});

// 3. Callback
app.post('/api/callback', (req, res) => {
    console.log("\n🔔 CALLBACK RECEIVED!");
    console.log(JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    if (Body && Body.stkCallback && Body.stkCallback.ResultCode === 0) {
        console.log("💰 Payment Successful!");
    }
    res.json({ ResultCode: 0, ResultDesc: "Success" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`\n🚀 Server running on port ${PORT}\n`));
