const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Service Account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tech-b30b8-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ✅ Test endpoint
app.get('/', (req, res) => {
  res.send('CWC Notification Server Running! ✅');
});

// ✅ Manual test notification
app.get('/send-notification', async (req, res) => {
  const { token, title, body } = req.query;
  if(!token) return res.send("❌ Token missing!");
  try {
    await admin.messaging().send({
      token: token,
      notification: { title: title || "CWC Test", body: body || "Test notification!" }
    });
    res.send("✅ Notification Sent!");
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

// ✅ Auto notification jab naya case aaye
db.ref("cases").on("child_changed", async (snap) => {
  const c = snap.val();
  if(c.status !== "New") return;
  try {
    const techSnap = await db.ref("technicians/" + c.techKey).once("value");
    const tech = techSnap.val();
    if(!tech?.fcmToken) return console.log("No FCM token for:", c.techKey);
    await admin.messaging().send({
      token: tech.fcmToken,
      notification: {
        title: "🔔 New Case - " + c.customer,
        body: c.address + " | " + c.problem
      },
      data: { caseId: c.id, techKey: c.techKey }
    });
    console.log("✅ Notification sent to:", tech.name);
  } catch(e) {
    console.log("❌ FCM Error:", e.message);
  }
});

// ✅ Naya case assign hone pe bhi trigger
db.ref("cases").on("child_added", async (snap) => {
  const c = snap.val();
  if(c.status !== "New") return;
  try {
    const techSnap = await db.ref("technicians/" + c.techKey).once("value");
    const tech = techSnap.val();
    if(!tech?.fcmToken) return;
    await admin.messaging().send({
      token: tech.fcmToken,
      notification: {
        title: "🔔 New Case - " + c.customer,
        body: c.address + " | " + c.problem
      }
    });
    console.log("✅ New case notification sent:", c.id);
  } catch(e) {
    console.log("❌ Error:", e.message);
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
