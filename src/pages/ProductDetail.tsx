import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } : null;
        setProduct(data);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} ditambahkan ke keranjang`, {
      action: {
        label: 'Lihat Keranjang',
        onClick: () => navigate('/cart')
      }
    });
  };

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-8 w-1/4 bg-muted rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="aspect-square bg-muted rounded-xl" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 bg-muted rounded" />
        <div className="h-6 w-1/2 bg-muted rounded" />
        <div className="h-32 w-full bg-muted rounded" />
      </div>
    </div>
  </div>;

  if (!product) return <div>Produk tidak ditemukan</div>;

  const images = product.imageURLs && product.imageURLs.length > 0 
    ? product.imageURLs 
    : [product.imageURL || `https://picsum.photos/seed/${product.id}/800/800`];

  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border shadow-sm">
            <img 
              src={images[activeImage]} 
              alt={product.name} 
              className="w-full h-full object-cover transition-opacity duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-1 overflow-x-auto">
              {images.map((img: string, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${activeImage === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mt-4">
              Rp {product.price.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="py-6 border-y space-y-4">
            <h3 className="font-bold text-lg">Deskripsi Produk</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description || 'Tidak ada deskripsi untuk produk ini.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Garansi Resmi
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-5 h-5 text-blue-500" />
              Pengiriman Cepat
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCcw className="w-5 h-5 text-orange-500" />
              7 Hari Retur
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button 
              size="lg" 
              className="flex-1 h-14 text-lg" 
              onClick={addToCart}
              disabled={product.stock <= 0}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Tambah ke Keranjang
            </Button>
            <Button size="lg" variant="outline" className="flex-1 h-14 text-lg" onClick={() => navigate('/chat')}>
              Chat Penjual
            </Button>
          </div>
          
          <p className="text-sm text-center text-muted-foreground">
            Stok tersedia: <span className="font-bold text-foreground">{product.stock}</span> unit
          </p>
        </div>
      </div>
    </div>
  );
}
