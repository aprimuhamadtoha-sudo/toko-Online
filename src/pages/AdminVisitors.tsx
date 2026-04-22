import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OWNER_EMAIL = 'aprimuhamadtoha@gmail.com';

interface Visitor {
  id: string;
  email: string;
  name: string;
  timestamp: string;
  lastSeen?: string;
  role?: string;
}

export default function AdminVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let unsubListener: (() => void) | undefined;

    const fetchAdminsAndFilter = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!isActive) return;

        const adminEmails = new Set(
          usersSnap.docs
            .map(d => d.data() as any)
            .filter(u => u.role === 'admin' || u.email?.toLowerCase() === OWNER_EMAIL)
            .map(u => u.email?.toLowerCase())
        );

        const q = query(collection(db, 'visitors'), orderBy('lastSeen', 'desc'));
        unsubListener = onSnapshot(q, (snapshot) => {
          if (!isActive) return;
          const data = snapshot.docs
            .map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            })) as Visitor[];
          
          const adminLogs = data.filter(v => adminEmails.has(v.email?.toLowerCase()));
          setVisitors(adminLogs);
          setLoading(false);
        }, (err) => {
          if (!isActive) return;
          console.error('Error syncing visitors:', err);
          if (err.message.includes('requires an index')) {
            onSnapshot(collection(db, 'visitors'), (snap) => {
              if (!isActive) return;
              const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitor));
              setVisitors(all.filter(v => adminEmails.has(v.email?.toLowerCase())));
              setLoading(false);
            });
          }
        });
      } catch (error) {
        if (!isActive) return;
        console.error('Error in AdminVisitors:', error);
        setLoading(false);
      }
    };

    fetchAdminsAndFilter();

    return () => {
      isActive = false;
      if (unsubListener) unsubListener();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Aktivitas Admin</h1>
          <p className="text-muted-foreground">Catatan login dan akses pengguna dengan hak administrator</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
            Total Admin Terdeteksi: {visitors.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pertama Kali</TableHead>
                  <TableHead>Terakhir Dilihat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada data pengunjung.
                    </TableCell>
                  </TableRow>
                ) : (
                  visitors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.timestamp}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.lastSeen || v.timestamp}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
