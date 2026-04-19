import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingBag, Users, TrendingUp, Package, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalSold: 0,
    totalVisitors: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch('/api/dashboard/stats').then(res => res.json()),
          fetch('/api/dashboard/charts').then(res => res.json())
        ]);

        if (statsRes && !statsRes.error) {
          setStats(statsRes);
        }
        if (chartsRes && !chartsRes.error) {
          if (chartsRes.salesData) setSalesData(chartsRes.salesData);
          if (chartsRes.categoryData) setCategoryData(chartsRes.categoryData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${color || 'bg-muted'}`}>
          <Icon className="h-4 w-4 text-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          {trend} dari bulan lalu
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="text-muted-foreground">Ringkasan performa toko Anda secara real-time</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/products">Kelola Produk</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/orders">Lihat Pesanan</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Laba Kotor (Omzet)" 
          value={`Rp ${stats.totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          trend="+12.5%"
          color="bg-blue-100"
        />
        <StatCard 
          title="Laba Bersih (Estimasi)" 
          value={`Rp ${Math.round(stats.totalProfit).toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+8.2%"
          color="bg-green-100"
        />
        <StatCard 
          title="Total Terjual" 
          value={`${stats.totalSold} Produk`} 
          icon={ShoppingBag} 
          trend="+15%"
          color="bg-purple-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Pesanan" 
          value={stats.totalOrders} 
          icon={ArrowUpRight} 
          trend="+5.2%" 
        />
        <StatCard 
          title="Total Produk" 
          value={stats.totalProducts} 
          icon={Package} 
          trend="+2" 
        />
        <StatCard 
          title="Pelanggan Aktif" 
          value={stats.totalUsers} 
          icon={Users} 
          trend="+18%" 
        />
        <StatCard 
          title="Total Pengunjung" 
          value={stats.totalVisitors} 
          icon={Users} 
          trend="+5%" 
          color="bg-orange-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Grafik Penjualan Mingguan</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Rp ${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`Rp ${value.toLocaleString()}`, 'Penjualan']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Kategori Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Belum ada data penjualan
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
