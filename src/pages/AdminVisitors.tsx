import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Visitor {
  email: string;
  name: string;
  timestamp: string;
}

export default function AdminVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/visitors');
      if (!res.ok) throw new Error('Gagal mengambil data pengunjung');
      const data = await res.json();
      setVisitors(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Pengunjung</h1>
          <p className="text-muted-foreground">Daftar pengguna yang telah mengakses toko ini (Data dari Google Sheets)</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchVisitors} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
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
                  <TableHead>Waktu Akses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Belum ada data pengunjung atau Spreadsheet belum dikonfigurasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  visitors.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.timestamp}</TableCell>
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
