import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Login berhasil!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.code === 'auth/unauthorized-domain' 
        ? 'Domain ini belum diizinkan di Firebase Console.' 
        : error.message || 'Gagal login dengan Google';
      toast.error(`Gagal login: ${errorMessage}`);
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
              <Button asChild className="w-full h-12 text-lg">
                <Link to="/admin">Ke Dashboard Admin</Link>
              </Button>
            ) : (
              <Button asChild className="w-full h-12 text-lg">
                <Link to="/">Mulai Belanja</Link>
              </Button>
            )}
            <Button variant="ghost" onClick={() => auth.signOut()}>Logout</Button>
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
          <Button variant="outline" className="w-full h-12" onClick={handleGoogleLogin}>
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
            Lanjutkan dengan Google
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Dengan masuk, Anda menyetujui Syarat dan Ketentuan kami.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
