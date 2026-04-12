'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { FiSend, FiX } from 'react-icons/fi';

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

    // Load old messages
    fetch(`${API_URL}/orders/${orderId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      });

    // Create a NEW socket connection just for chat or reuse? Better to create one focused on this component
    const newSocket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    newSocket.emit('join_order', { orderId });

    newSocket.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(newSocket);

    return () => {
      isMounted = false;
      newSocket.disconnect();
    };
  }, [isOpen, orderId, API_URL]);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !receiverId) return;

    socket.emit('send_message', {
      orderId,
      receiverId,
      receiverRole,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] z-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
        <div>
          <h4 className="font-bold">คุยกับ {receiverRole === 'Customer' ? 'ลูกค้า' : receiverRole === 'Driver' ? 'คนขับ' : 'ร้านค้า'}</h4>
          {!receiverId && <p className="text-xs text-indigo-300">ยังไม่มีผู้รับข้อความนี้</p>}
        </div>
        <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
          <FiX size={24} />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 text-sm mt-10">กำลังโหลด...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-400 text-sm mt-10">ยังไม่มีข้อความ เริ่มคุยได้เลย!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderRole === currentRole;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl ${isMe ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'}`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={receiverId ? "พิมพ์ข้อความ..." : "รอจับคู่..."}
          disabled={!receiverId}
          className="flex-1 bg-slate-100 border-transparent rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-0"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim() || !receiverId}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0"
        >
          <FiSend className={newMessage.trim() && receiverId ? 'translate-x-[-1px] translate-y-[1px]' : ''} />
        </button>
      </form>
    </div>
  );
}
