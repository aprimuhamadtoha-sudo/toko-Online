import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const fbConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const fbConfigValues = JSON.parse(fs.readFileSync(fbConfigPath, "utf-8"));

const firebaseApp = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: fbConfigValues.projectId,
});

const db = fbConfigValues.firestoreDatabaseId 
    ? getFirestore(firebaseApp, fbConfigValues.firestoreDatabaseId)
    : getFirestore(firebaseApp);

async function test() {
  try {
    const list = await db.collection("test").limit(1).get();
    console.log("Success fetching from Firestore:", list.empty ? "Empty" : "Has docs");
  } catch (e) {
    console.error("Error connecting to Firestore:", e);
  }
}
test();
