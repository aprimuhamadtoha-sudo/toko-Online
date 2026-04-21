import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { ExpressAuth, getSession } from "@auth/express";
import Google from "@auth/express/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "@auth/express/providers/credentials";
import admin from "firebase-admin";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma
const prisma = new PrismaClient();

// Load ENV
dotenv.config();

// Initialize Firebase Admin with Safety
try {
  const fbConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(fbConfigPath)) {
    const fbConfigValues = JSON.parse(fs.readFileSync(fbConfigPath, "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: fbConfigValues.projectId,
      });
      console.log("Firebase Admin initialized for project:", fbConfigValues.projectId);
    }
  } else {
    console.warn("Firebase config not found at:", fbConfigPath);
  }
} catch (error) {
  console.error("Critical: Failed to initialize Firebase Admin:", error);
}

/**
 * PETUNJUK PENGISIAN DATA ENV:
 * 
 * 1. AUTH_SECRET: 
 *    Gunakan string acak panjang (minimal 32 karakter).
 *    Contoh: run 'openssl rand -base64 32' di terminal.
 * 
 * 2. AUTH_GOOGLE_ID & AUTH_GOOGLE_SECRET:
 *    Dapatkan dari Google Cloud Console (https://console.cloud.google.com/apis/credentials)
 *    - Buat "OAuth client ID" tipe "Web application".
 *    - Authorized JavaScript origins: 
 *      https://ais-dev-66wsfdjubpyew52uiqb3rd-715587387761.asia-east1.run.app
 *      https://ais-pre-66wsfdjubpyew52uiqb3rd-715587387761.asia-east1.run.app
 *    - Authorized redirect URIs:
 *      https://ais-dev-66wsfdjubpyew52uiqb3rd-715587387761.asia-east1.run.app/api/auth/callback/google
 *      https://ais-pre-66wsfdjubpyew52uiqb3rd-715587387761.asia-east1.run.app/api/auth/callback/google
 */

// Auth.js Configuration
const authConfig: any = {
  basePath: "/api/auth",
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  secret: process.env.AUTH_SECRET || "66wsfdjubpyew52uiqb3rd-715587387761-auth-secret-123",
  adapter: PrismaAdapter(prisma),
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
          
          if (email) {
            const user = await prisma.user.upsert({
              where: { email: email },
              update: {
                id: uid,
                name: name,
                image: picture,
                role: isOwner ? 'admin' : 'buyer'
              },
              create: {
                id: uid,
                email: email,
                name: name,
                image: picture,
                role: isOwner ? 'admin' : 'buyer'
              }
            });
            return user;
          }
          return null;
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

  app.use(express.json());

  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/auth/session", async (req, res) => {
    try {
      const session = await getSession(req, authConfig);
      res.json(session || {});
    } catch (err) {
      console.error("Session Error:", err);
      res.status(500).json({ error: "Session Error" });
    }
  });

  app.use("/api/auth", ExpressAuth(authConfig));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: !!process.env.DATABASE_URL });
  });

  // REST API Routes
  app.get("/api/products", async (req, res) => {
    try {
      const result = await prisma.product.findMany({ orderBy: { name: 'asc' } });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const result = await prisma.product.create({
        data: {
          name,
          category,
          price: Number(price) || 0,
          purchasePrice: Number(purchasePrice) || 0,
          stock: Number(stock) || 0,
          description,
          imageUrl: imageURL
        }
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const result = await prisma.product.update({
        where: { id: req.params.id },
        data: {
          name,
          category,
          price: Number(price) || 0,
          purchasePrice: Number(purchasePrice) || 0,
          stock: Number(stock) || 0,
          description,
          imageUrl: imageURL
        }
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await prisma.product.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/settings/:id", async (req, res) => {
    try {
      const result = await prisma.setting.findUnique({ where: { id: req.params.id } });
      res.json(result?.value || null);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/settings/:id", async (req, res) => {
    try {
      await prisma.setting.upsert({
        where: { id: req.params.id },
        update: { value: req.body },
        create: { id: req.params.id, value: req.body }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      res.json(await prisma.user.findMany());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/visitors", async (req, res) => {
    try {
      res.json(await prisma.visitor.findMany({ orderBy: { lastSeen: 'desc' } }));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/visitors", async (req, res) => {
    const { email, name, timestamp, lastSeen } = req.body;
    try {
      await prisma.visitor.upsert({
        where: { email },
        update: { lastSeen },
        create: { email, name, timestamp, lastSeen }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    const { userId } = req.query;
    try {
      res.json(await prisma.order.findMany({
        where: userId ? { buyerId: String(userId) } : {},
        orderBy: { createdAt: 'desc' }
      }));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const { buyerId, buyerName, totalAmount, items } = req.body;
    try {
      const result = await prisma.order.create({
        data: { buyerId, buyerName, totalAmount: Number(totalAmount) || 0, items }
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const totalProductsCount = await prisma.product.count();
      const totalSoldSum = await prisma.product.aggregate({ _sum: { sold: true } });
      const orderStats = await prisma.order.aggregate({ _count: { _all: true }, _sum: { totalAmount: true } });
      const totalUsers = await prisma.user.count();
      const totalVisitors = await prisma.visitor.count();
      res.json({
        totalProducts: totalProductsCount,
        totalSold: totalSoldSum._sum.sold || 0,
        totalOrders: orderStats._count._all,
        totalRevenue: Number(orderStats._sum.totalAmount || 0),
        totalUsers: totalUsers,
        totalVisitors: totalVisitors,
        totalProfit: Number(orderStats._sum.totalAmount || 0) * 0.3
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/charts", async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, totalAmount: true }
      });
      const salesMap: Record<string, number> = {};
      orders.forEach(o => {
        const day = o.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
        salesMap[day] = (salesMap[day] || 0) + Number(o.totalAmount);
      });
      const salesData = Object.entries(salesMap).map(([name, sales]) => ({ name, sales }));
      const categoryData = await prisma.product.groupBy({
        by: ['category'],
        _sum: { sold: true },
        orderBy: { _sum: { sold: 'desc' } },
        take: 5
      });
      res.json({
        salesData,
        categoryData: categoryData.map(c => ({ name: c.category || 'Lainnya', value: c._sum.sold || 0 }))
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/admin/promote", async (req, res) => {
    const { email } = req.body;
    try {
      await prisma.user.upsert({
        where: { email: email.toLowerCase().trim() },
        update: { role: 'admin' },
        create: { id: email.toLowerCase().trim(), email: email.toLowerCase().trim(), role: 'admin', name: 'Pending Admin' }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users/:userId/unread-counts", async (req, res) => {
    const { userId } = req.params;
    try {
      const ordersCount = await prisma.order.count({ where: { buyerId: userId, status: 'pending' } });
      res.json({ orders: ordersCount, chats: 0, notifications: 0 });
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
