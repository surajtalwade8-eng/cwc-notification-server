const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tech-b30b8-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// Test endpoint
app.get('/', (req, res) => {
  res.send('CWC Notification Server Running! ✅');
});

// Manual test
app.get('/send-notification', async (req, res) => {
  const { token, title, body } = req.query;
  if(!token) return res.send("❌ Token missing!");
  try {
    await admin.messaging().send({
      token: token,
      notification: { title: title || "CWC Test", body: body || "Test!" },
      webpush: {
        notification: {
          icon: "https://surajtalwade8-eng.github.io/technician-system/icon-192.png",
          requireInteraction: true,
          vibrate: [500,200,500]
        },
        fcmOptions: {
          link: "https://surajtalwade8-eng.github.io/technician-system/technician-app.html"
        }
      }
    });
    res.send("✅ Notification Sent!");
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

// ✅ Naya case notification
async function sendNotification(techKey, title, body){
  try{
    const techSnap = await db.ref("technicians/"+techKey).once("value");
    const tech = techSnap.val();
    if(!tech?.fcmToken) return console.log("No token:", techKey);
    await admin.messaging().send({
      token: tech.fcmToken,
      notification: { title: title, body: body },
      webpush: {
        notification: {
          title: title,
          body: body,
          icon: "https://surajtalwade8-eng.github.io/technician-system/icon-192.png",
          requireInteraction: true,
          vibrate: [500,200,500]
        },
        fcmOptions: {
          link: "https://surajtalwade8-eng.github.io/technician-system/technician-app.html"
        }
      }
    });
    console.log("✅ Sent to:", tech.name);
  }catch(e){
    console.log("❌ Error:", e.message);
  }
}

db.ref("cases").on("child_added", async (snap) => {
  const c = snap.val();
  if(c.status !== "New") return;
  await sendNotification(
    c.techKey,
    "🔔 New Case - " + c.customer,
    c.address + " | " + c.problem
  );
});

db.ref("cases").on("child_changed", async (snap) => {
  const c = snap.val();
  if(c.status !== "New") return;
  await sendNotification(
    c.techKey,
    "🔔 New Case - " + c.customer,
    c.address + " | " + c.problem
  );
});

app.listen(3000, () => console.log('✅ Server running on port 3000'));
