import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
}

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const OWNER_EMAIL = 'aprimuhamadtoha@gmail.com';

  // Fetch Admin UID
  useEffect(() => {
    const fetchAdmin = async () => {
      const q = query(collection(db, 'users'), where('email', '==', OWNER_EMAIL));
      const snap = await getDocs(q);
      if (snap && !snap.empty && snap.docs.length > 0) {
        setAdminUid(snap.docs[0].id);
      }
    };
    fetchAdmin();
  }, []);

  // Admin: Fetch list of users who have messaged
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(u => u.id !== user?.uid && u.email !== OWNER_EMAIL)
      );
    });
    return () => unsub();
  }, [isAdmin, user]);

  // Fetch messages
  useEffect(() => {
    if (!user) return;
    
    let q;
    if (isAdmin) {
      if (!selectedUser) return;
      q = query(
        collection(db, 'chats'),
        where('senderId', 'in', [user.uid, selectedUser]),
        where('receiverId', 'in', [user.uid, selectedUser]),
        orderBy('createdAt', 'asc')
      );
    } else {
      // Buyer: Chat with admin
      if (!adminUid) return;
      q = query(
        collection(db, 'chats'),
        where('senderId', 'in', [user.uid, adminUid]),
        where('receiverId', 'in', [user.uid, adminUid]),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      console.error("Chat error:", error);
    });

    return () => unsubscribe();
  }, [user, isAdmin, selectedUser, adminUid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const receiverId = isAdmin ? selectedUser : adminUid;
    if (!receiverId) return;
    
    await addDoc(collection(db, 'chats'), {
      senderId: user.uid,
      receiverId: receiverId,
      text: newMessage,
      createdAt: serverTimestamp()
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[75vh] max-w-4xl mx-auto border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="flex h-full">
        {isAdmin && (
          <div className="w-1/3 border-r bg-muted/30">
            <div className="p-4 border-b font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Percakapan
            </div>
            <ScrollArea className="h-[calc(75vh-57px)]">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left ${selectedUser === u.id ? 'bg-muted border-r-2 border-primary' : ''}`}
                >
                  <Avatar>
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback>{(u.displayName || u.name || 'U')[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <div className="font-medium truncate">{u.displayName || u.name || 'User'}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}

        <div className={`flex-grow flex flex-col ${isAdmin && !selectedUser ? 'items-center justify-center' : ''}`}>
          {isAdmin && !selectedUser ? (
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Pilih percakapan untuk memulai chat</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-muted/10 flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{isAdmin ? 'U' : 'A'}</AvatarFallback>
                </Avatar>
                <div className="font-bold">{isAdmin ? 'Pelanggan' : 'Admin Toko'}</div>
              </div>

              <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                          msg.senderId === user?.uid
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-4 border-t bg-muted/10 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tulis pesan..."
                  className="flex-grow"
                />
                <Button type="submit" size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
