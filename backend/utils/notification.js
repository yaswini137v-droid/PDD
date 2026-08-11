const nodemailer = require('nodemailer');
const url = require('url');
const http = require('http');
const https = require('https');

// Helper to make HTTP POST requests without external dependencies
function postJson(urlStr, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = url.parse(urlStr);
      const postData = JSON.stringify(bodyObj);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, status: res.statusCode, body: data });
          } else {
            resolve({ ok: false, status: res.statusCode, body: data });
          }
        });
      });
      
      req.on('error', (err) => resolve({ ok: false, status: 500, body: err.message }));
      req.write(postData);
      req.end();
    } catch (error) {
      resolve({ ok: false, status: 500, body: error.message });
    }
  });
}

// Helper to send email via SMTP (if configured) or log to console
async function sendEmailAlert(user, alert, contacts) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
  
  const emailSubject = `🚨 EMERGENCY: Travel Safety Alert for ${user.name}`;
  const emailText = `
EMERGENCY SOS ALERT ACTIVATED

User Details:
- Name: ${user.name}
- Phone: ${user.phone}
- Email: ${user.email}

SOS Alert Details:
- Trigger Reason: ${alert.triggerType || 'Manual SOS Trigger'}
- Coordinates: Latitude ${alert.latitude}, Longitude ${alert.longitude}
- Live Location Link: ${googleMapsUrl}
- Time: ${alert.createdAt || new Date().toLocaleString()}

Please check on them immediately.
`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 12px; padding: 24px; background-color: #fef2f2;">
      <h2 style="color: #dc2626; margin-top: 0; text-align: center; font-size: 24px;">🚨 EMERGENCY SOS ALERT</h2>
      <p style="font-size: 16px; color: #1e293b; line-height: 1.5;">
        An emergency SOS alert has been triggered for <strong>${user.name}</strong>.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #475569; width: 35%;">User Name</td>
          <td style="padding: 12px; color: #0f172a;">${user.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #475569;">User Phone</td>
          <td style="padding: 12px; color: #0f172a;">${user.phone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #475569;">Trigger Type</td>
          <td style="padding: 12px; color: #dc2626; font-weight: bold; text-transform: uppercase;">${alert.triggerType || 'manual_sos'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #475569;">Coordinates</td>
          <td style="padding: 12px; color: #0f172a; font-family: monospace;">${alert.latitude}, ${alert.longitude}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; color: #475569;">Alert Time</td>
          <td style="padding: 12px; color: #0f172a;">${alert.createdAt || new Date().toLocaleString()}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${googleMapsUrl}" target="_blank" style="background-color: #ef4444; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4);">
          📍 View Live Location on Google Maps
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #fecaca; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
        This alert was generated automatically by the TravelSafetySOS security platform.
      </p>
    </div>
  `;

  const recipients = contacts.filter(c => c.email && c.email.trim().length > 0).map(c => c.email.trim());

  if (recipients.length === 0) {
    console.log('No guardian email addresses configured to receive alerts.');
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_PORT === '465',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: SMTP_FROM || `"TravelSafetySOS Alerts" <${SMTP_USER}>`,
        to: recipients.join(', '),
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });

      console.log(`✅ SOS Emergency Email successfully sent to guardians: ${recipients.join(', ')}`);
    } catch (error) {
      console.error('❌ Error sending SOS email alert via SMTP:', error.message);
    }
  } else {
    // Falls back to logging details to console
    console.log('\n=========================================');
    console.log('📬 [SIMULATED EMERGENCY EMAIL OUTBOX]');
    console.log(`To: ${recipients.join(', ')}`);
    console.log(`Subject: ${emailSubject}`);
    console.log('Body:');
    console.log(emailText);
    console.log('=========================================\n');
  }
}

// Helper to send SMS via Android SMS Gateway, Twilio, or log to console
async function sendSmsAlert(user, alert, contacts) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
  
  const smsBody = `🚨 EMERGENCY SOS: ${user.name} is in danger! Reason: ${alert.triggerType || 'Manual SOS'}. View their live location here: ${googleMapsUrl}`;

  const phoneNumbers = contacts.filter(c => c.phone && c.phone.trim().length > 0).map(c => c.phone.trim());

  if (phoneNumbers.length === 0) {
    console.log('No guardian phone numbers configured to receive alerts.');
    return;
  }

  const { 
    TWILIO_ACCOUNT_SID, 
    TWILIO_AUTH_TOKEN, 
    TWILIO_PHONE_NUMBER,
    SMS_GATEWAY_URL,
    SMS_GATEWAY_USER,
    SMS_GATEWAY_PASS
  } = process.env;

  if (SMS_GATEWAY_URL && SMS_GATEWAY_USER && SMS_GATEWAY_PASS) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${SMS_GATEWAY_USER}:${SMS_GATEWAY_PASS}`).toString('base64');
      const response = await postJson(
        SMS_GATEWAY_URL,
        {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        {
          textMessage: {
            text: smsBody,
          },
          phoneNumbers: phoneNumbers,
        }
      );

      if (response.ok) {
        console.log(`✅ SOS Emergency SMS successfully enqueued via Android SMS Gateway for: ${phoneNumbers.join(', ')}`);
      } else {
        console.error(`❌ Android SMS Gateway returned error (${response.status}):`, response.body);
      }
    } catch (error) {
      console.error('❌ Error sending SOS SMS alert via Android SMS Gateway:', error.message);
    }
  } else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      for (const phone of phoneNumbers) {
        await client.messages.create({
          body: smsBody,
          from: TWILIO_PHONE_NUMBER,
          to: phone,
        });
        console.log(`✅ SOS Emergency SMS successfully sent to guardian: ${phone}`);
      }
    } catch (error) {
      console.error('❌ Error sending SOS SMS alert via Twilio:', error.message);
    }
  } else {
    // Falls back to logging details to console
    console.log('\n=========================================');
    console.log('💬 [SIMULATED EMERGENCY SMS OUTBOX]');
    console.log(`To Phone Numbers: ${phoneNumbers.join(', ')}`);
    console.log(`Content: ${smsBody}`);
    console.log('=========================================\n');
  }
}

// Main notify function to orchestrate both SMS and Email
async function sendEmergencyNotifications(user, alert, contacts) {
  if (!user || !alert || !contacts || contacts.length === 0) {
    console.log('Insufficient details to send emergency notifications.');
    return;
  }
  
  console.log(`📡 Dispatching SOS emergency notifications for ${user.name}...`);
  await Promise.all([
    sendEmailAlert(user, alert, contacts),
    sendSmsAlert(user, alert, contacts),
  ]);
}

module.exports = {
  sendEmergencyNotifications,
};
