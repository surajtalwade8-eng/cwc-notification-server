const express = require('express');
const admin = require('firebase-admin');
const app = express();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "tech-b30b8",
    clientEmail: "firebase-adminsdk-fbsvc@tech-b30b8.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDme7BQh3E7vlel\nilXqCSY+IhOxzd52HCLO7QmkWt8iBMc5G/z049KS6Bbr4BbY1At8E879F87Odbyq\nRemcOgE5v5FdUNJ3nVCT/vBDvwEl8mjRDk/M+T/Mc0kwnzU5AFxXUYO2oMt48oW5\ngV6aZ8qUxozd7hOWE305B3Y5/aVqTcZHsqp+mb7VkfbaPZFq7HMWcJuk8dsiZaEO\ns7zyUT7GPIXKGeHOXOE2BCj8DZWm3YxtBF5kxOyS3fj2eUJLyKdzZOr43LebtuG+\npGTpJFD7mxjZL+Mfn4YuEvnF08fUYej67IyogXkIH0R8YgUyF2DY1KUF8t7G21JH\niqKBT7b1AgMBAAECggEAHaR/SOAeiVFB6v23bn3mP/v4fffs+lJEjMnyIUP5qiGk\nsLzfg+xwFupIFmaP8auV3YubpbPj6mw8i0aqFKhmI3P2oWKFaxJdvGb/pirg3i1G\n20pEq6dL1ALowRrcyLu55JYMg1a7TI8ecT0I+oFKTeeaUumtdbIEeyrxQuSTG3Bu\nQHIutxfHMYuCEssUhNc12hRUXb2vDBzNuLPDgOglV99HB0iGJt/KeNECrUPto3DF\nVVzvzIABMrCGXqP5f3KGQyJJYFk+7zCZaVAMct+DPNHUiQFGA2zRUG63e8I+qQzz\npdAK3zU81yauIkgdZszsBtp8yHtEz6q2fnyn2+wYGQKBgQD7mc3RgzNHZxOEyz1X\nGLkYYfKoiBqn8j3u9P0Z2XgVnJETouVSD+Mr8ehna+zxAQGzY0fnV+tFEaBotnH1\nigA92bUCTDg0Q6OQ0GsfDlGUblpMZNVCQCkvYKJBGwtWkySkcuAkfNyj8JtyJVIc\nRcaz3GHhSrSZCoL/yhkPZT2bOQKBgQDqg1wPsmSohL45QNwe9UcBxC5r7mhVIK9X\n2WKulniN5jtp0GpBBbUop44lT+6+lvqo4umKRSihnURtAXV2nL5E93PNSioeme3V\nbp+icmmGE6Acc9ApK302C8k2owAxbw1s5z6VdovL7i9uaqUKIU/9cQBXMnm5ihfp\nuueos7KtnQKBgQCouRqx7ob70h7fxZ+MAdNWi5C7/hHKIIPx9C6rIBAMhiMwBOQ9\n5NOWC7KrcE/DysYGM4TrmiT2+3wT3I2NeI7y60Ucllp2igltOqcre2Gv5VT+t/vf\nYsF7uRT2DhnLY/+FnFe9gFJCSj8kC+0FcrFuulKVT5DOtKLmv/OQRHdM2QKBgQDM\nb+9Vj8LIVdAuwSgjpNdd5tRBKvixHWk+QDgS0wINUeQBfrriLEOdSVRVmrUaWSvz\nBr1o2JlvKlZ4YIkx+bq1DLNbB4hoXPBE28c2Kl9rjrhJlXymJ09kSioDA14ruhAO\nHBkm2s1L3jxjGXz+s8OzwUr2uP38jTIDg/hnzR+60QKBgCzZv7Wr93uYEyA11PGm\n9xatdoDNl0A9PPaKV4j6jstUH7YRlGOyHeE51Y0m4xEoSlIcDn3mT1zefaKwUYqO\nSnMvNp1qDvfWLJBsRgDEysGGURd3MFmSVcYoVj6xftIurASyMbnGiorkHSu4Fpcz\nRsRhgkc2r5ICJuU76d0Y1g3D\n-----END PRIVATE KEY-----\n"
  }),
  databaseURL: "https://tech-b30b8-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();
const messaging = admin.messaging();
let notifiedCases = {};

db.ref("cases").on("child_added", function(snap){
  const c = snap.val();
  const key = snap.key;
  if(c.status === "New" && !notifiedCases[key]){
    notifiedCases[key] = true;
    db.ref("technicians/" + c.techKey + "/fcmToken").once("value").then(function(ts){
      const token = ts.val();
      if(!token){ console.log("No FCM token for: " + c.techKey); return; }
      return messaging.send({
        token: token,
        notification:{
          title: "🔔 NEW CASE!",
          body: c.customer + " - " + c.address
        },
        data:{ caseId: c.id || "" },
        android:{ priority:"high", notification:{ sound:"default" }},
        webpush:{
          headers:{ Urgency:"high" },
          notification:{ requireInteraction:true, vibrate:[600,200,600] }
        }
      });
    }).then(function(){
      console.log("✅ Notification sent: " + c.id);
    }).catch(function(e){
      console.log("❌ Error: " + e.message);
    });
  }
});

// Status change pe bhi watch karo
db.ref("cases").on("child_changed", function(snap){
  const c = snap.val();
  if(c.status === "New" && !notifiedCases[snap.key]){
    notifiedCases[snap.key] = true;
    db.ref("technicians/" + c.techKey + "/fcmToken").once("value").then(function(ts){
      const token = ts.val();
      if(!token) return;
      return messaging.send({
        token: token,
        notification:{
          title: "🔔 NEW CASE!",
          body: c.customer + " - " + c.address
        },
        webpush:{ headers:{ Urgency:"high" }, notification:{ requireInteraction:true }}
      });
    }).catch(function(e){ console.log(e.message); });
  }
});

app.get('/', function(req, res){
  res.send('✅ CWC Notification Server Running!');
});

app.listen(process.env.PORT || 3000, function(){
  console.log('Server started!');
});
