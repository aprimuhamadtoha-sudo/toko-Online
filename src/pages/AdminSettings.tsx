import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, ShieldCheck, UserPlus } from 'lucide-react';

const OWNER_EMAIL = 'aprimuhamadtoha@gmail.com';

export default function AdminSettings() {
  const [settings, setSettings] = useState({ 
    name: 'Jasa Las', 
    address: '', 
    logoURL: '',
    catalogTitle: 'Katalog Produk',
    catalogDescription: 'Temukan produk terbaik untuk kebutuhan Anda'
  });
  const [admins, setAdmins] = useState<{uid: string, email: string, displayName: string}[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch settings from Firestore
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().value;
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    });

    // Fetch admins
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const adminList = usersData
        .filter((u: any) => u.role === 'admin' && u.email?.toLowerCase() !== OWNER_EMAIL)
        .map((u: any) => ({
          uid: u.id,
          email: u.email,
          displayName: u.name || u.display_name || 'Admin'
        }));
      setAdmins(adminList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching admins:', err);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubUsers();
    };
  }, []);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'store'), { value: settings }, { merge: true });
      toast.success('Pengaturan toko diperbarui');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    const email = newAdminEmail.toLowerCase().trim();
    
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) throw new Error('Failed to promote');

      toast.success(`${email} sekarang menjadi Admin`);
      setNewAdminEmail('');
      
      // Refresh user list
      const usersRes = await fetch('/api/users').then(res => res.json());
      if (usersRes && Array.isArray(usersRes)) {
        const adminList = usersRes
          .filter((u: any) => u.role === 'admin' && u.email.toLowerCase() !== OWNER_EMAIL)
          .map((u: any) => ({
            uid: u.id,
            email: u.email,
            displayName: u.display_name || 'Admin'
          }));
        setAdmins(adminList);
      }
    } catch (error) {
      toast.error('Gagal menambahkan admin');
    }
  };

  const handleRemoveAdmin = async (uid: string, email: string) => {
    if (email.toLowerCase() === OWNER_EMAIL) {
      toast.error('Admin utama tidak dapat dihapus');
      return;
    }

    if (!confirm(`Hapus akses admin untuk ${email}?`)) return;

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uid, email, role: 'buyer' })
      });
      
      toast.success('Akses admin dicabut');
      // Refresh list
      const usersRes = await fetch('/api/users').then(res => res.json());
      if (usersRes && Array.isArray(usersRes)) {
        const adminList = usersRes
          .filter((u: any) => u.role === 'admin' && u.email.toLowerCase() !== OWNER_EMAIL)
          .map((u: any) => ({
            uid: u.id,
            email: u.email,
            displayName: u.display_name || 'Admin'
          }));
        setAdmins(adminList);
      }
    } catch (error) {
      toast.error('Gagal menghapus admin');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{settings.name}</h1>
          <p className="text-muted-foreground">{settings.address || 'Alamat belum diatur'}</p>
        </div>
        <Badge variant="outline" className="w-fit h-fit px-3 py-1 bg-white shadow-sm">
          Menu Pengaturan
        </Badge>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Identitas Toko</CardTitle>
            <CardDescription>Informasi dasar yang muncul di website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Toko</Label>
              <Input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Toko</Label>
              <Input value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>URL Logo</Label>
              <Input value={settings.logoURL} onChange={e => setSettings({...settings, logoURL: e.target.value})} />
            </div>
            <Button onClick={handleSaveSettings} className="w-full">Simpan Identitas</Button>
          </CardContent>
        </Card>

        {/* Catalog Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Katalog</CardTitle>
            <CardDescription>Ubah tampilan halaman katalog produk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Katalog</Label>
              <Input 
                value={settings.catalogTitle} 
                onChange={e => setSettings({...settings, catalogTitle: e.target.value})} 
                placeholder="Contoh: Katalog Produk Kami"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi Katalog</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.catalogDescription} 
                onChange={e => setSettings({...settings, catalogDescription: e.target.value})} 
                placeholder="Contoh: Temukan berbagai produk berkualitas dari kami..."
              />
            </div>
            <Button onClick={handleSaveSettings} className="w-full">Simpan Katalog</Button>
          </CardContent>
        </Card>

        {/* Admin Management */}
        <Card>
          <CardHeader>
            <CardTitle>Manajemen Admin</CardTitle>
            <CardDescription>Tambah atau hapus hak akses administrator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input 
                  placeholder="Email calon admin..." 
                  value={newAdminEmail} 
                  onChange={e => setNewAdminEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleAddAdmin}>
                <UserPlus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Daftar Admin Aktif</Label>
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div key={admin.uid} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className={`w-4 h-4 ${admin.email.toLowerCase() === OWNER_EMAIL ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {admin.displayName}
                          {admin.email.toLowerCase() === OWNER_EMAIL && (
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">Utama</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{admin.email}</p>
                      </div>
                    </div>
                    {admin.email.toLowerCase() !== OWNER_EMAIL && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveAdmin(admin.uid, admin.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
