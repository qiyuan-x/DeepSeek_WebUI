import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Message, Conversation } from '../types';

interface ChatDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'updated_at': string };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { 'conversation_id': string, 'created_at': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>('deepseek-chat-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('updated_at', 'updated_at');
        }
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversation_id', 'conversation_id');
          msgStore.createIndex('created_at', 'created_at');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export const db = {
  async getConversations(): Promise<Conversation[]> {
    const db = await initDB();
    const convs = await db.getAllFromIndex('conversations', 'updated_at');
    return convs.reverse(); // Newest first
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const db = await initDB();
    const msgs = await db.getAllFromIndex('messages', 'conversation_id', conversationId);
    return msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async createConversation(conv: Conversation) {
    const db = await initDB();
    await db.put('conversations', conv);
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const db = await initDB();
    const conv = await db.get('conversations', id);
    if (conv) {
      await db.put('conversations', { ...conv, ...updates, updated_at: new Date().toISOString() });
    }
  },

  async deleteConversation(id: string) {
    const db = await initDB();
    await db.delete('conversations', id);
    // Delete associated messages
    const tx = db.transaction('messages', 'readwrite');
    const index = tx.store.index('conversation_id');
    let cursor = await index.openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  async saveMessage(msg: Message) {
    const db = await initDB();
    await db.put('messages', msg);
    // Update conversation updated_at
    const conv = await db.get('conversations', msg.conversation_id);
    if (conv) {
      await db.put('conversations', { ...conv, updated_at: new Date().toISOString() });
    }
  },

  async getSettings() {
    const db = await initDB();
    const settings = await db.get('settings', 'user-settings');
    return settings || {};
  },

  async saveSettings(settings: any) {
    const db = await initDB();
    await db.put('settings', settings, 'user-settings');
  }
};
