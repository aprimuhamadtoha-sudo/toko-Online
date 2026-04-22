import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Visitor {
  id: string;
  email: string;
  name: string;
  timestamp: string;
  lastSeen?: string;
}

export default function AdminVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('lastSeen', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Visitor[];
      setVisitors(data);
      setLoading(false);
    }, (err) => {
      console.error('Error syncing visitors:', err);
      // Fallback to non-ordered if index is missing
      if (err.message.includes('requires an index')) {
        onSnapshot(collection(db, 'visitors'), (snap) => {
          setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitor)));
          setLoading(false);
        });
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Pengunjung</h1>
          <p className="text-muted-foreground">Daftar pengguna yang telah mengakses toko ini secara real-time</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Total Pengunjung: {visitors.length}
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
