import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT,
        price NUMERIC DEFAULT 0,
        purchase_price NUMERIC DEFAULT 0,
        stock INTEGER DEFAULT 0,
        sold INTEGER DEFAULT 0,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        display_name TEXT,
        role TEXT DEFAULT 'buyer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id TEXT REFERENCES users(id),
        buyer_name TEXT,
        total_amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        items JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value JSONB
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        name TEXT,
        timestamp TEXT,
        last_seen TEXT
      );
    `);
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    client.release();
  }
}

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM products ORDER BY name ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO products (name, category, price, purchase_price, stock, description, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [name, category, price, purchasePrice, stock, description, imageURL]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, category, price, purchasePrice, stock, description, imageURL } = req.body;
    try {
      const result = await pool.query(
        "UPDATE products SET name = $1, category = $2, price = $3, purchase_price = $4, stock = $5, description = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *",
        [name, category, price, purchasePrice, stock, description, imageURL, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM products WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/settings/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT value FROM settings WHERE id = $1", [req.params.id]);
      res.json(result.rows[0]?.value || null);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/settings/:id", async (req, res) => {
    try {
      await pool.query(
        "INSERT INTO settings (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = $2",
        [req.params.id, req.body]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { id, email, displayName, role } = req.body;
    try {
      // Prioritize email conflict because admins might be pre-registered by email
      await pool.query(
        "INSERT INTO users (id, email, display_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET id = $1, display_name = EXCLUDED.display_name, role = COALESCE(users.role, EXCLUDED.role)",
        [id, email.toLowerCase().trim(), displayName, role || 'buyer']
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
      res.json(result.rows[0] || null);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [req.params.email]);
      res.json(result.rows[0] || null);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/visitors", async (req, res) => {
    const { email, name, timestamp, lastSeen } = req.body;
    try {
      await pool.query(
        "INSERT INTO visitors (email, name, timestamp, last_seen) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET last_seen = $4",
        [email, name, timestamp, lastSeen]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/visitors", async (req, res) => {
    const { email, lastSeen } = req.body;
    try {
      await pool.query("UPDATE visitors SET last_seen = $1 WHERE email = $2", [lastSeen, email]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/visitors", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM visitors ORDER BY last_seen DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { userId } = req.query;
      let query = "SELECT * FROM orders";
      let params: any[] = [];
      if (userId) {
        query += " WHERE buyer_id = $1";
        params.push(userId);
      }
      query += " ORDER BY created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const { buyerId, buyerName, totalAmount, items } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO orders (buyer_id, buyer_name, total_amount, items) VALUES ($1, $2, $3, $4) RETURNING *",
        [buyerId, buyerName, totalAmount, JSON.stringify(items)]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const orderRes = await client.query("SELECT * FROM orders WHERE id = $1", [id]);
      const order = orderRes.rows[0];
      if (!order) throw new Error("Order not found");

      const confirmedStatuses = ['diterima', 'shipped', 'delivered'];
      const isNewStatusConfirmed = confirmedStatuses.includes(status);
      const isOldStatusConfirmed = confirmedStatuses.includes(order.status);

      // Simple stock adjustment logic in backend
      if (isNewStatusConfirmed && !isOldStatusConfirmed) {
        for (const item of order.items) {
          await client.query("UPDATE products SET stock = stock - $1, sold = sold + $1 WHERE id = $2", [item.quantity, item.productId]);
        }
      } else if (!isNewStatusConfirmed && isOldStatusConfirmed) {
        for (const item of order.items) {
          await client.query("UPDATE products SET stock = stock + $1, sold = sold - $1 WHERE id = $2", [item.quantity, item.productId]);
        }
      }

      const result = await client.query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const productsRes = await pool.query("SELECT COUNT(*) as total_products, SUM(sold) as total_sold FROM products");
      const ordersRes = await pool.query("SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders");
      const usersRes = await pool.query("SELECT COUNT(*) as total_users FROM users");
      const visitorsRes = await pool.query("SELECT COUNT(DISTINCT email) as total_visitors FROM visitors");
      
      res.json({
        totalProducts: parseInt(productsRes.rows[0].total_products),
        totalSold: parseInt(productsRes.rows[0].total_sold || 0),
        totalOrders: parseInt(ordersRes.rows[0].total_orders),
        totalRevenue: parseFloat(ordersRes.rows[0].total_revenue || 0),
        totalUsers: parseInt(usersRes.rows[0].total_users),
        totalVisitors: parseInt(visitorsRes.rows[0].total_visitors),
        totalProfit: parseFloat(ordersRes.rows[0].total_revenue || 0) * 0.3 // Estimate
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/admin/promote", async (req, res) => {
    const { email } = req.body;
    try {
      // Use email as a temporary ID if the user doesn't exist. 
      // When they login, the AuthContext should handle syncing by email.
      await pool.query(
        "INSERT INTO users (id, email, role, display_name) VALUES ($1, $1, 'admin', 'Pending Admin') ON CONFLICT (email) DO UPDATE SET role = 'admin'",
        [email.toLowerCase().trim()]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/charts", async (req, res) => {
    try {
      // Weekly sales (simplified)
      const salesQuery = `
        SELECT 
          to_char(created_at, 'Dy') as name, 
          SUM(total_amount) as sales 
        FROM orders 
        WHERE created_at > now() - interval '7 days'
        GROUP BY 1, date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      `;
      const salesRes = await pool.query(salesQuery);
      
      // Category sales
      const catQuery = `
        SELECT category as name, SUM(sold) as value 
        FROM products 
        GROUP BY 1 
        ORDER BY 2 DESC 
        LIMIT 5
      `;
      const catRes = await pool.query(catQuery);
      
      res.json({
        salesData: salesRes.rows,
        categoryData: catRes.rows
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
