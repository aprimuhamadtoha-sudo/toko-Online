import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, CheckCircle, Truck } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" /> Dibayar</Badge>;
      case 'shipped': return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200"><Truck className="w-3 h-3 mr-1" /> Dikirim</Badge>;
      case 'delivered': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Selesai</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) return <div>Memuat pesanan...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Riwayat Pesanan</h1>
      {orders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Belum ada pesanan.</p>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 flex flex-row items-center justify-between py-3 px-6">
              <div className="text-sm font-medium">
                Order ID: <span className="text-muted-foreground">#{order.id.slice(-8)}</span>
              </div>
              {getStatusBadge(order.status)}
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x Rp {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="font-bold">Rp {(item.quantity * item.price).toLocaleString()}</p>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center text-lg font-bold">
                  <span>Total Pembayaran</span>
                  <span className="text-primary">Rp {order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
