import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router-dom';

import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const { user, isAdmin, signIn, signOut } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signIn();
      toast.success('Berhasil masuk!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      const msg = error.message || '';
      if (msg.includes('popup-blocked')) {
        toast.error('Popup diblokir! Silakan izinkan popup di browser Anda.');
      } else if (msg.includes('Cookie diblokir')) {
        toast.error(msg, { duration: 10000 });
      } else {
        toast.error('Gagal masuk: ' + (error.message || 'Error tidak diketahui'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Anda Sudah Masuk</CardTitle>
            <CardDescription>Anda masuk sebagai {user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <Button render={<Link to="/admin" />} className="w-full h-12 text-lg">
                Ke Dashboard Admin
              </Button>
            ) : (
              <Button render={<Link to="/" />} className="w-full h-12 text-lg">
                Mulai Belanja
              </Button>
            )}
            <Button variant="ghost" onClick={signOut}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Selamat Datang</CardTitle>
          <CardDescription>
            Masuk untuk mulai berbelanja atau mengelola toko Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button 
            variant="outline" 
            className="w-full h-12" 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
            )}
            {isLoggingIn ? 'Memproses...' : 'Lanjutkan dengan Google'}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Dengan masuk, Anda menyetujui Syarat dan Ketentuan kami.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
