import { useState } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { MessageSquare, Calendar, Bell, Users, Search, Info } from 'lucide-react';
import { Modal } from '@/app/components/Modal';

interface Message {
    id: string;
    sender: string;
    senderRole: string;
    content: string;
    time: string;
    read: boolean;
}

export function CommunicationCenterPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'Ahmed Ibrahim', senderRole: 'Driver', content: 'Delayed at Depot due to long queue.', time: '10:30 AM', read: false },
        { id: '2', sender: 'Garage Manager', senderRole: 'Manager', content: 'Maintenance schedule for TK-005 updated.', time: 'Yesterday', read: true },
        { id: '3', sender: 'MD', senderRole: 'MD', content: 'Please review the pending supply requests.', time: 'Yesterday', read: true },
    ]);

    const filteredMessages = messages.filter(m =>
        m.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Communication Center"
                subtitle="Manage alerts, notifications, and internal messaging"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <button
                        onClick={() => setShowNewMessageModal(true)}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <MessageSquare className="w-5 h-5" />
                        New Broadcast
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-900 dark:text-gray-100 text-sm">Inbox</div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 font-bold text-xs flex justify-between items-center hover:bg-blue-100">
                                <span>Direct Messages</span>
                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px]">3</span>
                            </button>
                            <button className="w-full text-left px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 font-medium text-xs flex justify-between items-center transition-colors">
                                <span>System Alerts</span>
                                <span className="bg-gray-200 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[10px]">12</span>
                            </button>
                            <button className="w-full text-left px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 font-medium text-xs flex justify-between items-center transition-colors">
                                <span>Announcements</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Team Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">MD Online</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Garage Manager Online</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Admin Offline</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message List / Content */}
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                    {/* Search Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all text-sm"
                                placeholder="Search messages..."
                            />
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-bold">
                            <Calendar className="w-4 h-4" />
                            <span>Latest</span>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {filteredMessages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-xl border transition-all cursor-pointer ${msg.read ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-blue-200' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                                }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.read ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-blue-200 text-blue-700'
                                            }`}>
                                            {msg.sender.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`text-sm ${msg.read ? 'font-bold text-gray-700' : 'font-black text-gray-900'}`}>{msg.sender}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">{msg.senderRole}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{msg.time}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 pl-10">{msg.content}</p>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                        End of messages
                    </div>
                </div>
            </div>

            <Modal isOpen={showNewMessageModal} onClose={() => setShowNewMessageModal(false)} title="New Broadcast" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Recipients</label>
                        <select className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none">
                            <option>All Drivers</option>
                            <option>All Staff</option>
                            <option>Management Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Message</label>
                        <textarea className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none h-32 resize-none" placeholder="Type your message here..."></textarea>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setShowNewMessageModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 dark:text-gray-400">Cancel</button>
                        <button className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold">Send Broadcast</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
