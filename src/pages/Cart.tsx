import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const [items, setItems] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(savedCart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
    toast.info('Produk dihapus dari keranjang');
  };

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) return toast.error('Silakan login untuk checkout');
    if (items.length === 0) return toast.error('Keranjang kosong');

    try {
      // Create order
      const orderData = {
        buyerId: user.uid,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: total,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);

      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'ApriMuhamadToha@gmail.com', // Admin email or UID
        title: 'Pesanan Baru!',
        message: `Ada pesanan baru senilai Rp ${total.toLocaleString()}`,
        read: false,
        createdAt: serverTimestamp()
      });

      localStorage.removeItem('cart');
      setItems([]);
      toast.success('Pesanan berhasil dibuat!');
      navigate('/orders');
    } catch (error) {
      console.error(error);
      toast.error('Gagal melakukan checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Keranjang Kosong</h2>
        <p className="text-muted-foreground">Anda belum menambahkan produk apapun.</p>
        <Button onClick={() => navigate('/')}>Mulai Belanja</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Keranjang Belanja</h1>
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex gap-4">
              <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                <img src={item.imageURL || `https://picsum.photos/seed/${item.id}/200/200`} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-primary font-bold">Rp {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Ringkasan Belanja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Total Item</span>
              <span>{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg">
              <span>Total Harga</span>
              <span>Rp {total.toLocaleString()}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 text-lg" onClick={handleCheckout}>
              Checkout Sekarang
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
