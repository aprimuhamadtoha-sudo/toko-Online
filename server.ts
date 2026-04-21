import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ExpressAuth, getSession } from "@auth/express";
import Google from "@auth/express/providers/google";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import Credentials from "@auth/express/providers/credentials";
import admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';
import fs from "fs";

// Load ENV
dotenv.config();

// Initialize Firebase Admin
const fbConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const fbConfigValues = JSON.parse(fs.readFileSync(fbConfigPath, "utf-8"));

const firebaseApp = !admin.apps.length ? admin.initializeApp({
  projectId: fbConfigValues.projectId,
}) : admin.apps[0];

let db;
try {
  // Use the specific database ID if provided in config
  db = fbConfigValues.firestoreDatabaseId 
    ? getFirestore(firebaseApp, fbConfigValues.firestoreDatabaseId)
    : getFirestore(firebaseApp);
} catch (e) {
  console.warn("Failed to initialize firestore with specific database ID, falling back to default.", e);
  db = getFirestore(firebaseApp);
}

/**
 * PETUNJUK PENGISIAN DATA ENV:
 * 1. AUTH_SECRET: Minimal 32 karakter
 * 2. AUTH_GOOGLE_ID & AUTH_GOOGLE_SECRET (Sudah dikonfigurasi)
 */

// Auth.js Configuration
const authConfig: any = {
  basePath: "/api/auth",
  trustHost: true,
  debug: false,
  secret: process.env.AUTH_SECRET || "66wsfdjubpyew52uiqb3rd-715587387761-auth-secret-123",
  adapter: FirestoreAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const decodedToken = await admin.auth().verifyIdToken(credentials.idToken as string);
          const email = decodedToken.email?.toLowerCase().trim();
          const uid = decodedToken.uid;
          const name = decodedToken.name || email?.split('@')[0] || 'User';
          const picture = decodedToken.picture || '';

          const isOwner = email === 'aprimuhamadtoha@gmail.com';
          const role = isOwner ? 'admin' : 'buyer';
          
          const userRef = db.collection('users').doc(uid);
          const userDoc = await userRef.get();
          
          const userData = {
            id: uid,
            email,
            name,
            image: picture,
            role,
          };

          if (!userDoc.exists) {
            await userRef.set(userData);
          } else {
            await userRef.update({
              name,
              image: picture,
              role,
            });
          }
          
          return userData;
        } catch (error) {
          console.error("Authorize Bridge Error:", error);
          return null;
        }
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `authjs.callback-url`,
      options: {
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
  callbacks: {
    async session({ session, user, token }: any) {
      const u = user || token?.user;
      if (session.user && u) {
        session.user.id = u.id;
        session.user.uid = u.id;
        session.user.role = u.role || 'buyer';
        session.user.name = u.name;
        session.user.email = u.email;
        session.user.image = u.image;
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) token.user = user;
      return token;
    }
  },
  session: { strategy: "jwt" as const },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/auth/session", async (req, res) => {
    try {
      console.log("[AUTH] Fetching session...");
      const session = await getSession(req, authConfig);
      res.json(session || {});
    } catch (err) {
      console.error("[AUTH] Session error:", err);
      res.json({}); 
    }
  });

  app.use("/api/auth", ExpressAuth(authConfig));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebase: true });
  });

  // REST API Routes using Firestore
  app.get("/api/products", async (req, res) => {
    try {
      const snapshot = await db.collection('products').orderBy('name', 'asc').get();
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const productData = {
        name,
        category,
        price: Number(price) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        stock: Number(stock) || 0,
        sold: 0,
        description,
        image_url: imageURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const docRef = await db.collection('products').add(productData);
      res.status(201).json({ id: docRef.id, ...productData });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const updateData: any = {
        name,
        category,
        price: Number(price) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        stock: Number(stock) || 0,
        description,
        image_url: imageURL,
        updatedAt: new Date().toISOString()
      };
      await db.collection('products').doc(req.params.id).update(updateData);
      res.json({ id: req.params.id, ...updateData });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await db.collection('products').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/settings/:id", async (req, res) => {
    try {
      const doc = await db.collection('settings').doc(req.params.id).get();
      res.json(doc.exists ? doc.data()?.value : null);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/settings/:id", async (req, res) => {
    try {
      await db.collection('settings').doc(req.params.id).set({ value: req.body }, { merge: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { id, email, role } = req.body;
    try {
      if (id) {
        await db.collection('users').doc(id).update({ role });
      } else if (email) {
        const lowerEmail = email.toLowerCase().trim();
        const snapshot = await db.collection('users').where('email', '==', lowerEmail).limit(1).get();
        if (!snapshot.empty) {
          await db.collection('users').doc(snapshot.docs[0].id).update({ role });
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/visitors", async (req, res) => {
    try {
      const snapshot = await db.collection('visitors').orderBy('lastSeen', 'desc').get();
      const visitors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(visitors);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/visitors", async (req, res) => {
    const { email, name, timestamp, lastSeen } = req.body;
    try {
      // Find visitor by email or create new
      const snapshot = await db.collection('visitors').where('email', '==', email).limit(1).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await db.collection('visitors').doc(docId).update({ lastSeen });
      } else {
        await db.collection('visitors').add({
          email,
          name,
          timestamp,
          lastSeen
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    const { userId } = req.query;
    try {
      let query = db.collection('orders').orderBy('createdAt', 'desc');
      if (userId) {
        query = query.where('buyerId', '==', userId);
      }
      const snapshot = await query.get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const { buyerId, buyerName, totalAmount, items } = req.body;
    try {
      const orderData = {
        buyerId,
        buyerName,
        totalAmount: Number(totalAmount) || 0,
        items,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const docRef = await db.collection('orders').add(orderData);
      res.status(201).json({ id: docRef.id, ...orderData });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const productsCount = (await db.collection('products').count().get()).data().count;
      const ordersCount = (await db.collection('orders').count().get()).data().count;
      const usersCount = (await db.collection('users').count().get()).data().count;
      const visitorsCount = (await db.collection('visitors').count().get()).data().count;

      const ordersSnapshot = await db.collection('orders').get();
      let totalRevenue = 0;
      ordersSnapshot.forEach(doc => {
        totalRevenue += Number(doc.data().totalAmount || 0);
      });

      const productsSnapshot = await db.collection('products').get();
      let totalSold = 0;
      productsSnapshot.forEach(doc => {
        totalSold += Number(doc.data().sold || 0);
      });
      
      res.json({
        totalProducts: productsCount,
        totalSold: totalSold,
        totalOrders: ordersCount,
        totalRevenue: totalRevenue,
        totalUsers: usersCount,
        totalVisitors: visitorsCount,
        totalProfit: totalRevenue * 0.3
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/charts", async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', sevenDaysAgo.toISOString())
        .get();

      const salesMap: Record<string, number> = {};
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.createdAt);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        salesMap[day] = (salesMap[day] || 0) + Number(data.totalAmount || 0);
      });

      const salesData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => ({
        name,
        sales: salesMap[name] || 0
      }));

      const categoryMap: Record<string, number> = {};
      const productsSnapshot = await db.collection('products').get();
      productsSnapshot.forEach(doc => {
        const data = doc.data();
        const cat = data.category || 'Lainnya';
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(data.sold || 0);
      });

      const categoryData = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

      res.json({
        salesData,
        categoryData
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/admin/promote", async (req, res) => {
    const { email } = req.body;
    try {
      const lowerEmail = email.toLowerCase().trim();
      const snapshot = await db.collection('users').where('email', '==', lowerEmail).limit(1).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await db.collection('users').doc(docId).update({ role: 'admin' });
      } else {
        // Create skeleton profile
        await db.collection('users').add({
          email: lowerEmail,
          role: 'admin',
          name: 'Pending Admin',
          createdAt: new Date().toISOString()
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users/:userId/unread-counts", async (req, res) => {
    const { userId } = req.params;
    try {
      const ordersCount = (await db.collection('orders')
        .where('buyerId', '==', userId)
        .where('status', '==', 'pending')
        .count().get()).data().count;

      res.json({
        orders: ordersCount,
        chats: 0,
        notifications: 0
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.use("/api/*", (err: any, req: any, res: any, next: any) => {
    console.error("API Global Error:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => console.error("Startup Crash:", err));
