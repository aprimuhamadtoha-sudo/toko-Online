import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  sold: number;
  description: string;
  imageURL: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    purchasePrice: 0,
    stock: 0,
    description: '',
    imageURL: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Produk diperbarui');
      } else {
        console.log('Attempting to add product:', formData);
        await addDoc(collection(db, 'products'), {
          ...formData,
          sold: 0,
          createdAt: serverTimestamp()
        });
        toast.success('Produk ditambahkan');
      }
      setIsAddOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', category: '', price: 0, purchasePrice: 0, stock: 0, description: '', imageURL: '' });
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Gagal menyimpan produk: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus produk ini?')) {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Produk dihapus');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Produk</h1>
          <p className="text-muted-foreground">Tambah, edit, atau hapus produk dari katalog</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', category: '', price: 0, purchasePrice: 0, stock: 0, description: '', imageURL: '' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input id="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock">Stok</Label>
                  <Input id="stock" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="purchasePrice">Harga Beli (Rp)</Label>
                  <Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Harga Jual (Rp)</Label>
                  <Input id="price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageURL">URL Gambar</Label>
                <Input id="imageURL" value={formData.imageURL} onChange={e => setFormData({...formData, imageURL: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea 
                  id="description" 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button onClick={handleSave}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga Beli</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Terjual</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                      <img src={product.imageURL || `https://picsum.photos/seed/${product.id}/100/100`} alt="" className="w-full h-full object-cover" />
                    </div>
                    {product.name}
                  </div>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>Rp {(product.purchasePrice || 0).toLocaleString()}</TableCell>
                <TableCell>Rp {product.price.toLocaleString()}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>{product.sold}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingProduct(product);
                      setFormData({
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        purchasePrice: product.purchasePrice || 0,
                        stock: product.stock,
                        description: product.description,
                        imageURL: product.imageURL
                      });
                      setIsAddOpen(true);
                    }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
