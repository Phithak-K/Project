'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, X, Image as ImageIcon, Camera, Loader2, Paperclip } from 'lucide-react';

interface ChatBoxProps {
  orderId: number;
  currentRole: string;
  receiverRole: string;
  receiverId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBox({ orderId, currentRole, receiverRole, receiverId, isOpen, onClose }: ChatBoxProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingImage, setSendingImage] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    const token = getAuthToken();
    if (!token) return;

    fetch(`${API_URL}/orders/${orderId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      });

    const newSocket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    newSocket.emit('join_order', { orderId });

    newSocket.on('receive_message', (msg: any) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    setSocket(newSocket);

    return () => {
      isMounted = false;
      newSocket.disconnect();
    };
  }, [isOpen, orderId, API_URL]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault();
    if (!socket || !receiverId) return;
    if (!newMessage.trim() && !imageUrl) return;

    socket.emit('send_message', {
      orderId,
      receiverId,
      receiverRole,
      content: newMessage.trim() || (imageUrl ? 'ส่งรูปภาพ' : ''),
      imageUrl: imageUrl || null
    });

    setNewMessage('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSendingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleSend({ preventDefault: () => {} } as any, base64);
      setSendingImage(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const getRoleBadge = (role: string) => {
    if (role === 'Customer') return 'ลูกค้า';
    if (role === 'Merchant') return 'ร้านค้า';
    if (role === 'Driver')   return 'คนขับ';
    return role;
  };

  return (
    <div className="sp-chat-panel sp-animate">
      {/* Header */}
      <div className="sp-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: receiverId ? 'var(--success-text)' : 'var(--n-500)', boxShadow: receiverId ? '0 0 8px var(--success-text)' : 'none' }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>แชทกับ{getRoleBadge(receiverRole)}</p>
            <p className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.55rem', marginTop: '0.1rem' }}>
              {receiverId ? 'เชื่อมต่อแล้ว' : 'รอการเชื่อมต่อ...'}
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--n-400)', cursor: 'pointer', padding: '4px' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="sp-chat-messages">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <Loader2 className="sp-spinner" style={{ color: 'var(--n-200)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="sp-empty-centered" style={{ padding: '2rem' }}>
            <p className="sp-caps" style={{ color: 'var(--n-300)', fontSize: '0.6rem' }}>เริ่มการสนทนา</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderRole === currentRole;
            return (
              <div key={msg.id || i} className={`sp-msg ${isMe ? 'sp-msg-self' : 'sp-msg-other'}`}>
                <div className="sp-msg-bubble">
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Attached" 
                      style={{ borderRadius: '0.5rem', marginBottom: '0.5rem', maxWidth: '100%', display: 'block' }} 
                    />
                  )}
                  {msg.content && <span>{msg.content}</span>}
                </div>
                <span className="sp-msg-time">
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="sp-chat-input-row">
        <input 
          type="file" accept="image/*" ref={fileInputRef} className="hidden" 
          onChange={handleImageUpload} 
        />
        <button 
          type="button" onClick={() => fileInputRef.current?.click()}
          disabled={!receiverId || sendingImage}
          style={{ background: 'none', border: 'none', color: 'var(--n-400)', cursor: 'pointer', display: 'flex' }}
        >
          {sendingImage ? <Loader2 size={18} className="sp-spinner" /> : <Camera size={18} />}
        </button>
        <input 
          type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
          placeholder={receiverId ? "พิมพ์ข้อความ..." : "ไม่สามารถส่งได้"}
          disabled={!receiverId}
          className="sp-chat-input"
        />
        <button 
          type="submit" disabled={!receiverId || !newMessage.trim()}
          style={{ 
            background: 'var(--brand-500)', border: 'none', color: '#fff', 
            width: '32px', height: '32px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: (!receiverId || !newMessage.trim()) ? 0.4 : 1
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
