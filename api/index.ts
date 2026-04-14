import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Google Sheets Auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// API: Log Visitor
app.post("/api/log-visitor", async (req, res) => {
  try {
    if (!SPREADSHEET_ID) throw new Error("SPREADSHEET_ID not set");
    const { email, name, timestamp } = req.body;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Visitors!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[email, name, timestamp]],
      },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error logging visitor:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Get Visitors
app.get("/api/visitors", async (req, res) => {
  try {
    if (!SPREADSHEET_ID) throw new Error("SPREADSHEET_ID not set");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Visitors!A:C',
    });
    const rows = response.data.values || [];
    const visitors = rows.map((row: any) => ({
      email: row[0],
      name: row[1],
      timestamp: row[2],
    }));
    res.json(visitors);
  } catch (error: any) {
    console.error("Error fetching visitors:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
