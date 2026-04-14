import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, LogOut, Menu, X, LayoutDashboard, Store, MessageSquare, Package, Bell, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function Navbar() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [storeSettings, setStoreSettings] = useState({ name: 'Jasa Las', logoURL: '' });

  useEffect(() => {
    if (!user) return;
    
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('buyerId', '==', user.uid), where('status', '==', 'pending')), (snap) => {
      setOrderCount(snap.size);
    });

    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('receiverId', '==', user.uid), where('read', '==', false)), (snap) => {
      setChatCount(snap.size);
    });

    return () => { unsubOrders(); unsubChats(); };
  }, [user]);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'store');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as any);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.email === 'ApriMuhamadToha@gmail.com' ? 'ApriMuhamadToha@gmail.com' : user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const NavItems = () => (
    <>
      <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
        <Store className="w-4 h-4" />
        Toko
      </Link>
      {user && (
        <>
          <Link to="/orders" className="flex items-center gap-2 text-sm font-medium hover:text-blue-200 transition-colors relative">
            <Package className="w-4 h-4" />
            Pesanan
            {orderCount > 0 && (
              <Badge className="absolute -top-2 -left-2 px-1 py-0 text-[10px] min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white border-none">
                {orderCount}
              </Badge>
            )}
          </Link>
          <Link to="/chat" className="flex items-center gap-2 text-sm font-medium hover:text-blue-200 transition-colors relative">
            <MessageSquare className="w-4 h-4" />
            Chat
            {chatCount > 0 && (
              <Badge className="absolute -top-2 -left-2 px-1 py-0 text-[10px] min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white border-none">
                {chatCount}
              </Badge>
            )}
          </Link>
          <Link to="/cart" className="flex items-center gap-2 text-sm font-medium hover:text-blue-200 transition-colors relative">
            <ShoppingCart className="w-4 h-4" />
            Keranjang
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -left-2 px-1 py-0 text-[10px] min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white border-none">
                {cartCount}
              </Badge>
            )}
          </Link>
        </>
      )}
      {isAdmin && (
        <>
          <Link to="/admin" className="flex items-center gap-2 text-sm font-bold text-white hover:opacity-90 transition-all bg-blue-500 px-3 py-1.5 rounded-full border border-blue-400 shadow-sm">
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
          </Link>
          <Link to="/admin/visitors" className="flex items-center gap-2 text-sm font-medium text-white hover:text-blue-200 transition-colors">
            <Users className="w-4 h-4" />
            Pengunjung
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-2 text-sm font-medium text-white hover:text-blue-200 transition-colors">
            <Package className="w-4 h-4" />
            Pengaturan
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/90">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
          {storeSettings.logoURL ? (
            <img src={storeSettings.logoURL} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              {storeSettings.name.charAt(0)}
            </div>
          )}
          {storeSettings.name}
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <NavItems />
          {user && (
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </div>
          )}
          {user ? (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l">
              <span className="text-sm font-medium text-muted-foreground">{profile?.displayName}</span>
              {user?.email === 'ApriMuhamadToha@gmail.com' && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/50 text-primary">Owner</Badge>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-4">
          {user && (
            <Link to="/cart">
              <ShoppingCart className="w-5 h-5" />
            </Link>
          )}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-6 mt-8">
                <NavItems />
                <div className="pt-4 border-t">
                  {user ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5" />
                        <span className="font-medium">{profile?.displayName}</span>
                      </div>
                      <Button variant="outline" className="justify-start" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="w-full">
                      <Link to="/login">Login</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
