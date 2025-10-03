import { useState, useEffect } from 'react'
import { ZKIdentity, CryptoIdentity, SessionManager } from '@/lib/crypto'

/**
 * Hook for managing ZK authentication state
 */
export function useZKAuth() {
  const [identity, setIdentity] = useState<CryptoIdentity | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [zkInstance] = useState(() => new ZKIdentity())

  useEffect(() => {
    const checkExistingSession = () => {
      setIsLoading(true)
      
      // Check for valid session
      if (SessionManager.validateSession()) {
        const sessionData = SessionManager.getSessionData()
        if (sessionData) {
          setIdentity(sessionData as unknown as CryptoIdentity)
          setIsAuthenticated(true)
        }
      }
      
      setIsLoading(false)
    }
    
    checkExistingSession()
  }, [])

  const generateIdentity = async (): Promise<CryptoIdentity> => {
    setIsLoading(true)
    try {
      const newIdentity = await zkInstance.generate()
      
      // Store identity securely
      const exportedIdentity = zkInstance.exportIdentity()
      if (exportedIdentity) {
        localStorage.setItem('zk_identity', exportedIdentity)
      }
      
      // Create session
      SessionManager.createSession(newIdentity)
      
      setIdentity(newIdentity)
      setIsAuthenticated(true)
      
      return newIdentity
    } finally {
      setIsLoading(false)
    }
  }

  const authenticateWithIdentity = async (importedIdentity: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      if (zkInstance.importIdentity(importedIdentity)) {
        const restoredIdentity = zkInstance.getIdentity()
        if (restoredIdentity) {
          SessionManager.createSession(restoredIdentity)
          setIdentity(restoredIdentity)
          setIsAuthenticated(true)
          return true
        }
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    SessionManager.clearSession()
    localStorage.removeItem('zk_identity')
    setIdentity(null)
    setIsAuthenticated(false)
  }

  const generateSenderAlias = (recipientDomain: string): string => {
    if (!identity) throw new Error('No identity available')
    return zkInstance.generateSenderAlias(recipientDomain, identity.privateKey)
  }

  const generateEphemeralAddress = (): string => {
    return zkInstance.generateEphemeralAddress()
  }

  const verifyProof = async (proof: string, publicHash: string): Promise<boolean> => {
    return zkInstance.verifyZKProof(proof, publicHash)
  }

  return {
    identity,
    isAuthenticated,
    isLoading,
    generateIdentity,
    authenticateWithIdentity,
    logout,
    generateSenderAlias,
    generateEphemeralAddress,
    verifyProof,
    zkInstance
  }
}