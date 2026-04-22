import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  imageURL: string;
  description: string;
}

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ 
    catalogTitle: 'Katalog Produk', 
    catalogDescription: 'Temukan produk terbaik untuk kebutuhan Anda' 
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'store'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data().value;
          setStoreSettings({
            catalogTitle: data?.catalogTitle || 'Katalog Produk',
            catalogDescription: data?.catalogDescription || 'Temukan produk terbaik untuk kebutuhan Anda'
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Product }));
        setProducts(data.map(p => ({
          ...p,
          imageURL: (p as any).image_url || p.imageURL,
          price: Number(p.price)
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{storeSettings.catalogTitle}</h1>
        <p className="text-muted-foreground">{storeSettings.catalogDescription}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden group flex flex-col">
            <div className="aspect-square relative overflow-hidden bg-muted">
              <img 
                src={product.imageURL || `https://picsum.photos/seed/${product.id}/400/400`} 
                alt={product.name}
                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <Badge className="absolute top-2 right-2" variant="secondary">
                {product.category}
              </Badge>
            </div>
            <CardHeader className="p-4">
              <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
              <p className="text-2xl font-bold text-primary">
                Rp {product.price.toLocaleString('id-ID')}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
              <p className="text-xs mt-2 font-medium">
                Stok: {product.stock}
              </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 gap-2">
              <Button render={<Link to={`/product/${product.id}`} />} variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Detail
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Beli
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
