import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const fbConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const fbConfigValues = JSON.parse(fs.readFileSync(fbConfigPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: fbConfigValues.projectId,
});

async function test() {
  console.log("admin auth:", admin.auth().verifyIdToken.name);
}
test();
