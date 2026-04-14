import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Gagal memuat data pesanan");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const orderRef = doc(db, 'orders', orderId);
      
      const confirmedStatuses = ['diterima', 'shipped', 'delivered'];
      const isNewStatusConfirmed = confirmedStatuses.includes(newStatus);
      const isOldStatusConfirmed = confirmedStatuses.includes(order.status);

      // Update stock if status changes to a confirmed state from an unconfirmed one
      if (isNewStatusConfirmed && !isOldStatusConfirmed) {
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            stock: increment(-item.quantity),
            sold: increment(item.quantity)
          });
        }
      }
      // Return stock if status changes FROM a confirmed state to an unconfirmed one (e.g. 'ditolak' or 'pending')
      else if (!isNewStatusConfirmed && isOldStatusConfirmed) {
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            stock: increment(item.quantity),
            sold: increment(-item.quantity)
          });
        }
      }

      await updateDoc(orderRef, { status: newStatus });
      toast.success('Status pesanan diperbarui');
    } catch (error: any) {
      console.error('Error updating status:', error);
      // Detailed error message for debugging
      const errorMessage = error.code === 'permission-denied' 
        ? 'Akses ditolak (Permission Denied). Pastikan Anda adalah Admin.' 
        : error.message || 'Terjadi kesalahan';
      toast.error(`Gagal memperbarui status: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Pesanan</h1>
          <p className="text-muted-foreground">Pantau dan perbarui status pesanan pelanggan</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Admin: {auth.currentUser?.email}
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Memuat data pesanan...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Belum ada pesanan masuk.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">#{order.id.slice(-8)}</TableCell>
                  <TableCell>{order.buyerId.slice(0, 8)}...</TableCell>
                  <TableCell className="font-bold">Rp {order.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'diterima' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ditolak' ? 'bg-red-100 text-red-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.createdAt?.toDate().toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select 
                      defaultValue={order.status} 
                      onValueChange={(val) => updateStatus(order.id, val)}
                    >
                      <SelectTrigger className="w-[140px] ml-auto">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="diterima">Diterima</SelectItem>
                        <SelectItem value="ditolak">Ditolak</SelectItem>
                        <SelectItem value="shipped">Dikirim</SelectItem>
                        <SelectItem value="delivered">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
