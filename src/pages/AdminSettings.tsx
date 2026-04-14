import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, ShieldCheck, UserPlus } from 'lucide-react';

const OWNER_EMAIL = 'aprimuhamadtoha@gmail.com';

export default function AdminSettings() {
  const [settings, setSettings] = useState({ name: 'Jasa Las', address: '', logoURL: '' });
  const [admins, setAdmins] = useState<{uid: string, email: string, displayName: string}[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Store Settings
      const docRef = doc(db, 'settings', 'store');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as any);
      }

      // Fetch Admins
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminList = querySnapshot.docs
        .map(doc => ({
          uid: doc.id,
          email: doc.data().email,
          displayName: doc.data().displayName || 'Admin'
        }))
        .filter(admin => admin.email.toLowerCase() !== OWNER_EMAIL);
      setAdmins(adminList);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'store'), settings);
      toast.success('Pengaturan toko diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    const email = newAdminEmail.toLowerCase().trim();
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('User dengan email ini belum pernah login ke aplikasi');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
      
      setAdmins([...admins, { 
        uid: userDoc.id, 
        email: userDoc.data().email, 
        displayName: userDoc.data().displayName || 'Admin' 
      }]);
      setNewAdminEmail('');
      toast.success(`${email} sekarang menjadi Admin`);
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
      await updateDoc(doc(db, 'users', uid), { role: 'buyer' });
      setAdmins(admins.filter(a => a.uid !== uid));
      toast.success('Akses admin dicabut');
    } catch (error) {
      toast.error('Gagal menghapus admin');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola identitas toko dan hak akses admin</p>
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
            <Button onClick={handleSaveSettings} className="w-full">Simpan Perubahan</Button>
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
