import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState({ name: 'Jasa Las', address: '', logoURL: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'store');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as any);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'store'), settings);
      toast.success('Pengaturan toko diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pengaturan Toko</h1>
      <div className="space-y-4 max-w-md">
        <div>
          <Label>Nama Toko</Label>
          <Input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
        </div>
        <div>
          <Label>Alamat Toko</Label>
          <Input value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
        </div>
        <div>
          <Label>URL Logo</Label>
          <Input value={settings.logoURL} onChange={e => setSettings({...settings, logoURL: e.target.value})} />
        </div>
        <Button onClick={handleSave}>Simpan Pengaturan</Button>
      </div>
    </div>
  );
}
