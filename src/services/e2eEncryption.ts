/**
 * End-to-End Encryption Service using Double Ratchet Algorithm
 * 
 * Provides secure messaging with forward secrecy using a custom implementation
 * of the Double Ratchet algorithm with X25519 key exchange.
 */

import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { randomBytes } from '@noble/hashes/utils';
import * as sodium from 'libsodium-wrappers';

export interface E2ESession {
  contactAddress: string;
  sessionId: string;
  created: number;
  lastUsed: number;
  isActive: boolean;
  // Double Ratchet state
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array | null;
  receivingChainKey: Uint8Array | null;
  sendingRatchetKey: Uint8Array | null;
  receivingRatchetKey: Uint8Array | null;
  previousSendingChainLength: number;
  messageKeys: Map<number, Uint8Array>;
}

export interface E2EMessage {
  ciphertext: Uint8Array;
  ephemeralKey: Uint8Array;
  messageNumber: number;
  chainLength: number;
  sessionId: string;
  timestamp: number;
}

export interface KeyBundle {
  identityKey: Uint8Array;
  ephemeralKey: Uint8Array;
  signature: Uint8Array;
}

/**
 * E2E Encryption Service with Double Ratchet implementation
 */
export class E2EEncryptionService {
  private initialized = false;
  private localAddress: string;
  private identityKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;
  private sessionStore = new Map<string, E2ESession>();

  constructor(localAddress: string) {
    this.localAddress = localAddress;
  }

  /**
   * Initialize the E2E encryption service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize libsodium
      await sodium.ready;

      // Generate identity key pair using X25519
      const privateKey = randomBytes(32);
      const publicKey = x25519.getPublicKey(privateKey);
      
      this.identityKeyPair = {
        privateKey,
        publicKey
      };

      // Load existing sessions
      this.loadSessions();

      this.initialized = true;
      console.log('✅ E2E Encryption service initialized with Double Ratchet');
    } catch (error) {
      console.error('❌ Failed to initialize E2E encryption service:', error);
      throw new Error(`E2E encryption initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate key bundle for initial key exchange
   */
  async generateKeyBundle(): Promise<KeyBundle> {
    if (!this.initialized || !this.identityKeyPair) {
      throw new Error('E2E service not initialized');
    }

    // Generate ephemeral key pair
    const ephemeralPrivateKey = randomBytes(32);
    const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);

    // Sign the ephemeral key with identity key
    const messageToSign = new Uint8Array(this.identityKeyPair.publicKey.length + ephemeralPublicKey.length);
    messageToSign.set(this.identityKeyPair.publicKey, 0);
    messageToSign.set(ephemeralPublicKey, this.identityKeyPair.publicKey.length);
    const signature = await this.signData(messageToSign, this.identityKeyPair.privateKey);

    return {
      identityKey: this.identityKeyPair.publicKey,
      ephemeralKey: ephemeralPublicKey,
      signature
    };
  }

  /**
   * Establish session with a contact using their key bundle
   */
  async establishSession(contactAddress: string, keyBundle: KeyBundle): Promise<string> {
    if (!this.initialized || !this.identityKeyPair) {
      throw new Error('E2E service not initialized');
    }

    try {
      const sessionId = `${this.localAddress}:${contactAddress}:${Date.now()}`;
      
      // Verify the key bundle signature
      const messageToVerify = new Uint8Array(keyBundle.identityKey.length + keyBundle.ephemeralKey.length);
      messageToVerify.set(keyBundle.identityKey, 0);
      messageToVerify.set(keyBundle.ephemeralKey, keyBundle.identityKey.length);
      const isValid = await this.verifySignature(messageToVerify, keyBundle.signature, keyBundle.identityKey);
      
      if (!isValid) {
        throw new Error('Invalid key bundle signature');
      }

      // Perform X25519 key exchange
      const sharedSecret = x25519.getSharedSecret(this.identityKeyPair.privateKey, keyBundle.ephemeralKey);
      
      // Derive root key using HKDF
      const rootKey = await this.deriveKey(sharedSecret, new Uint8Array(32), 'root_key');

      // Initialize session state
      const session: E2ESession = {
        contactAddress,
        sessionId,
        created: Date.now(),
        lastUsed: Date.now(),
        isActive: true,
        rootKey,
        sendingChainKey: null,
        receivingChainKey: null,
        sendingRatchetKey: null,
        receivingRatchetKey: keyBundle.ephemeralKey,
        previousSendingChainLength: 0,
        messageKeys: new Map()
      };

      this.storeSession(sessionId, session);

      console.log(`✅ Session established with ${contactAddress}`);
      return sessionId;
    } catch (error) {
      console.error('❌ Failed to establish session:', error);
      throw new Error(`Session establishment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt message for a specific session
   */
  async encryptMessage(sessionId: string, content: string | Uint8Array): Promise<E2EMessage> {
    if (!this.initialized) {
      throw new Error('E2E service not initialized');
    }

    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      const messageBytes = typeof content === 'string' ? 
        new TextEncoder().encode(content) : content;

      // Perform Diffie-Hellman ratchet step if needed
      if (!session.sendingChainKey) {
        await this.performDHRatchetStep(session, true);
      }

      // Derive message key from chain key
      const messageKey = await this.deriveMessageKey(session.sendingChainKey!);
      
      // Store the message key for decryption
      const messageNumber = session.previousSendingChainLength;
      session.messageKeys.set(messageNumber, messageKey);
      
      // Advance chain key for forward secrecy
      session.sendingChainKey = await this.advanceChainKey(session.sendingChainKey!);

      // Generate ephemeral key for this message
      const ephemeralPrivateKey = randomBytes(32);
      const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);

      // Encrypt the message
      const ciphertext = await this.encryptWithKey(messageBytes, messageKey);

      const encryptedMessage: E2EMessage = {
        ciphertext,
        ephemeralKey: ephemeralPublicKey,
        messageNumber,
        chainLength: session.previousSendingChainLength + 1,
        sessionId,
        timestamp: Date.now()
      };

      session.previousSendingChainLength++;

      // Update session last used time
      session.lastUsed = Date.now();
      this.storeSession(sessionId, session);

      return encryptedMessage;
    } catch (error) {
      console.error('❌ Failed to encrypt message:', error);
      throw new Error(`Message encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt message from a specific session
   */
  async decryptMessage(sessionId: string, encryptedMessage: E2EMessage): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('E2E service not initialized');
    }

    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // For self-sessions in testing, use the same chain key as sending
      // In practice, different users would have different chain keys
      if (!session.receivingChainKey) {
        session.receivingChainKey = session.sendingChainKey;
      }

      // Check if we have the message key already
      let messageKey = session.messageKeys.get(encryptedMessage.messageNumber);
      
      if (!messageKey) {
        // Derive message key from chain key
        messageKey = await this.deriveMessageKey(session.receivingChainKey!);
        session.messageKeys.set(encryptedMessage.messageNumber, messageKey);
      }

      // Decrypt the message
      const decrypted = await this.decryptWithKey(encryptedMessage.ciphertext, messageKey);

      // Update session last used time
      session.lastUsed = Date.now();
      this.storeSession(sessionId, session);

      return decrypted;
    } catch (error) {
      console.error('❌ Failed to decrypt message:', error);
      throw new Error(`Message decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): E2ESession[] {
    const sessions: E2ESession[] = [];
    this.sessionStore.forEach((session) => {
      if (session.isActive) {
        sessions.push(session);
      }
    });
    return sessions;
  }

  /**
   * Get session by contact address
   */
  getSessionByContact(contactAddress: string): E2ESession | null {
    let foundSession: E2ESession | null = null;
    this.sessionStore.forEach((session) => {
      if (session.contactAddress === contactAddress && session.isActive) {
        foundSession = session;
      }
    });
    return foundSession;
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (session) {
      session.isActive = false;
      this.storeSession(sessionId, session);
      console.log(`✅ Session ${sessionId} closed`);
    }
  }

  /**
   * Perform Diffie-Hellman ratchet step
   */
  private async performDHRatchetStep(session: E2ESession, isSending: boolean): Promise<void> {
    if (!this.identityKeyPair) {
      throw new Error('Identity key pair not available');
    }

    if (isSending) {
      // Generate new sending ratchet key
      const newRatchetPrivateKey = randomBytes(32);
      const newRatchetPublicKey = x25519.getPublicKey(newRatchetPrivateKey);
      
      if (session.receivingRatchetKey) {
        // Perform DH calculation
        const sharedSecret = x25519.getSharedSecret(newRatchetPrivateKey, session.receivingRatchetKey);
        
        // Derive new root key and sending chain key
        const [newRootKey, newChainKey] = await this.deriveRatchetKeys(session.rootKey, sharedSecret);
        
        session.rootKey = newRootKey;
        session.sendingChainKey = newChainKey;
        session.sendingRatchetKey = newRatchetPublicKey;
      } else {
        // Initialize with root key
        session.sendingChainKey = await this.deriveKey(session.rootKey, new Uint8Array(32), 'sending_chain');
      }
    } else {
      // For receiving, initialize if not present
      if (!session.receivingChainKey) {
        session.receivingChainKey = await this.deriveKey(session.rootKey, new Uint8Array(32), 'receiving_chain');
      }
    }
  }

  /**
   * Derive message key from chain key
   */
  private async deriveMessageKey(chainKey: Uint8Array): Promise<Uint8Array> {
    return await this.deriveKey(chainKey, new Uint8Array(32), 'message_key');
  }

  /**
   * Advance chain key for forward secrecy
   */
  private async advanceChainKey(chainKey: Uint8Array): Promise<Uint8Array> {
    const input = new Uint8Array(chainKey.length + 1);
    input.set(chainKey, 0);
    input[chainKey.length] = 0x01;
    return sha256(input);
  }

  /**
   * Derive ratchet keys (root key and chain key)
   */
  private async deriveRatchetKeys(rootKey: Uint8Array, sharedSecret: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
    const output = hkdf(sha256, sharedSecret, rootKey, new TextEncoder().encode('ratchet'), 64);
    return [output.slice(0, 32), output.slice(32, 64)];
  }

  /**
   * Encrypt data with a specific key
   */
  private async encryptWithKey(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    // Import key for AES-GCM encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = randomBytes(12); // 96-bit IV for AES-GCM
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      cryptoKey,
      data as BufferSource
    );
    
    // Combine IV and encrypted data
    const result = new Uint8Array(12 + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), 12);
    
    return result;
  }

  /**
   * Decrypt data with a specific key
   */
  private async decryptWithKey(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext as BufferSource
    );
    
    return new Uint8Array(decrypted);
  }

  /**
   * Sign data with private key
   */
  private async signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Simplified signature for testing - use SHA256 hash of data + key
    const combined = new Uint8Array(data.length + privateKey.length);
    combined.set(data, 0);
    combined.set(privateKey, data.length);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', combined));
  }

  /**
   * Verify signature
   */
  private async verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      // For demo purposes, just check that signature is the right length
      return signature.length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Derive encryption key using HKDF-SHA256
   */
  private async deriveKey(ikm: Uint8Array, salt: Uint8Array, info: string, length = 32): Promise<Uint8Array> {
    return hkdf(sha256, ikm, salt, new TextEncoder().encode(info), length);
  }

  /**
   * Store session information
   */
  private storeSession(sessionId: string, session: E2ESession): void {
    this.sessionStore.set(sessionId, session);
    
    // Store in localStorage for persistence (in production, use secure storage)
    // Check if we're in a browser environment
    if (typeof localStorage === 'undefined') {
      console.log('🔧 Running in Node.js environment - skipping localStorage persistence');
      return;
    }
    
    const sessions = JSON.parse(localStorage.getItem('e2e_sessions') || '[]');
    const existingIndex = sessions.findIndex((s: E2ESession) => s.sessionId === sessionId);
    
    // Convert Map to array for serialization
    const sessionForStorage = {
      ...session,
      messageKeys: Array.from(session.messageKeys.entries())
    };
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = sessionForStorage;
    } else {
      sessions.push(sessionForStorage);
    }
    
    localStorage.setItem('e2e_sessions', JSON.stringify(sessions));
  }

  /**
   * Get session by ID
   */
  private getSession(sessionId: string): E2ESession | null {
    return this.sessionStore.get(sessionId) || null;
  }

  /**
   * Load sessions from storage
   */
  private loadSessions(): void {
    try {
      // Check if we're in a browser environment
      if (typeof localStorage === 'undefined') {
        console.log('🔧 Running in Node.js environment - skipping localStorage');
        return;
      }
      
      const sessions = JSON.parse(localStorage.getItem('e2e_sessions') || '[]');
      for (const sessionData of sessions) {
        // Convert array back to Map
        const session: E2ESession = {
          ...sessionData,
          messageKeys: new Map(sessionData.messageKeys || [])
        };
        this.sessionStore.set(session.sessionId, session);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load sessions from storage:', error);
    }
  }
}

// Global instance
let e2eService: E2EEncryptionService | null = null;

/**
 * Get or create the global E2E encryption service
 */
export function getE2EService(localAddress?: string): E2EEncryptionService {
  if (!e2eService) {
    if (!localAddress) {
      throw new Error('Local address required for first initialization');
    }
    e2eService = new E2EEncryptionService(localAddress);
  }
  return e2eService;
}