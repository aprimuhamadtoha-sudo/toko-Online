import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Package, RotateCcw, ShoppingBag } from 'lucide-react';
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
  imageURLs?: string[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    purchasePrice: 0,
    stock: 0,
    description: '',
    imageURL: '',
    imageURLs: [] as string[]
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Product[];
      
      // Sort in memory to be resilient to missing fields
      const sortedData = data.sort((a, b) => {
        const dateA = (a as any).createdAt?.seconds ? (a as any).createdAt.toDate() : new Date((a as any).createdAt || 0);
        const dateB = (b as any).createdAt?.seconds ? (b as any).createdAt.toDate() : new Date((b as any).createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setProducts(sortedData.map(p => ({
        ...p,
        imageURL: p.imageURLs?.[0] || (p as any).image_url || p.imageURL,
        purchasePrice: Number((p as any).purchasePrice || (p as any).purchase_price || 0)
      })));
    }, (error) => {
      console.error("Products Sync Error:", error);
      toast.error("Gagal memuat produk: " + error.message);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      const finalImageURL = formData.imageURLs[0] || formData.imageURL;
      const productData = {
        ...formData,
        imageURL: finalImageURL,
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Produk diperbarui');
        setSuccessMessage('Produk berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          sold: 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Produk ditambahkan');
        setSuccessMessage('Produk berhasil ditambahkan ke katalog!');
      }

      setIsAddOpen(false);
      setIsSuccessOpen(true);
      setEditingProduct(null);
      setFormData({ name: '', category: '', price: 0, purchasePrice: 0, stock: 0, description: '', imageURL: '', imageURLs: [] });
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Gagal menyimpan produk');
    }
  };

  const addImageUrl = () => {
    setFormData({ ...formData, imageURLs: [...formData.imageURLs, ''] });
  };

  const removeImageUrl = (index: number) => {
    const newUrls = [...formData.imageURLs];
    newUrls.splice(index, 1);
    setFormData({ ...formData, imageURLs: newUrls });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2048 * 1024) {
      toast.error("Ukuran file terlalu besar (Maks 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (index !== undefined) {
        const newUrls = [...formData.imageURLs];
        newUrls[index] = base64String;
        setFormData({ ...formData, imageURLs: newUrls });
      } else {
        // Fallback or multi-add
        setFormData({ ...formData, imageURLs: [...formData.imageURLs.filter(u => u !== ''), base64String] });
      }
      toast.success("Foto berhasil diunggah");
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus produk ini?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Produk dihapus');
      } catch (error) {
        toast.error('Gagal menghapus produk');
      }
    }
  };

  const handleResetSold = async () => {
    if (!confirm('Apakah Anda yakin ingin menetralkan (reset) semua statistik produk terjual? Tindakan ini tidak dapat dibatalkan.')) return;
    
    try {
      const batch = writeBatch(db);
      products.forEach((product) => {
        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, { sold: 0 });
      });
      await batch.commit();
      toast.success('Statistik penjualan telah dinetralkan');
    } catch (error) {
      console.error('Error resetting sales:', error);
      toast.error('Gagal menetralkan statistik');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Produk</h1>
          <p className="text-muted-foreground">Tambah, edit, atau hapus produk dari katalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetSold} className="text-orange-600 border-orange-200 hover:bg-orange-50">
            <RotateCcw className="w-4 h-4 mr-2" />
            Netralkan Produk
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', category: '', price: 0, purchasePrice: 0, stock: 0, description: '', imageURL: '', imageURLs: [''] });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                <div className="flex items-center justify-between">
                  <Label>Foto Produk</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="file" 
                      id="image-upload-new" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => document.getElementById('image-upload-new')?.click()} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Unggah Foto
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {formData.imageURLs.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg border bg-muted overflow-hidden">
                      {url ? (
                        <>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-red-400" onClick={() => removeImageUrl(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div 
                          className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-muted/80"
                          onClick={() => document.getElementById(`upload-${index}`)?.click()}
                        >
                          <Plus className="w-6 h-6 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">Klik Unggah</span>
                          <Input 
                            type="file" 
                            id={`upload-${index}`} 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, index)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {formData.imageURLs.length === 0 && (
                     <div 
                        className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:bg-muted/30"
                        onClick={() => document.getElementById('image-upload-new')?.click()}
                      >
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <span className="text-xs text-muted-foreground">Tambah Foto</span>
                     </div>
                  )}
                </div>
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

        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="sm:max-w-[400px] text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-green-600" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Berhasil!</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">{successMessage}</p>
              <Button onClick={() => setIsSuccessOpen(false)} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                Selesai
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
                        imageURL: product.imageURL,
                        imageURLs: product.imageURLs && product.imageURLs.length > 0 
                          ? product.imageURLs 
                          : [product.imageURL || '']
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
