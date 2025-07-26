/**
 * IPFS Integration Demo Component
 * Demonstrates real IPFS functionality with Filebase
 */

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { 
  CloudArrowUp, 
  CloudArrowDown, 
  Shield, 
  Globe, 
  FileText,
  VideoCamera,
  Image,
  CheckCircle
} from '@phosphor-icons/react'
import { ipfsService } from '../services/ipfs'
import { videoCallService } from '../services/VideoCallService'
import { emailService } from '../services/EmailService'
import { toast } from 'sonner'

interface IPFSFile {
  cid: string
  name: string
  size: number
  type: string
  url: string
  encrypted: boolean
  timestamp: number
}

export function IPFSIntegrationDemo() {
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadCID, setDownloadCID] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [files, setFiles] = useState<IPFSFile[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  /**
   * Upload content to IPFS with encryption
   */
  const handleUpload = async () => {
    if (!content.trim() && !selectedFile) {
      toast.error('Please enter content or select a file')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Generate encryption key
      const encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      let result
      let fileName = 'text-content'
      let fileType = 'text/plain'

      if (selectedFile) {
        // Upload file
        const fileBuffer = await selectedFile.arrayBuffer()
        result = await ipfsService.uploadEncrypted(
          fileBuffer,
          encryptionKey,
          {
            filename: selectedFile.name,
            contentType: selectedFile.type,
            size: selectedFile.size
          }
        )
        fileName = selectedFile.name
        fileType = selectedFile.type
      } else {
        // Upload text content
        result = await ipfsService.uploadEncrypted(
          content,
          encryptionKey,
          {
            type: 'text',
            length: content.length
          }
        )
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Store encryption key securely (in production, this would be managed properly)
      localStorage.setItem(`ipfs_key_${result.cid}`, JSON.stringify(await crypto.subtle.exportKey('jwk', encryptionKey)))

      const newFile: IPFSFile = {
        cid: result.cid,
        name: fileName,
        size: result.size,
        type: fileType,
        url: result.url,
        encrypted: true,
        timestamp: Date.now()
      }

      setFiles(prev => [newFile, ...prev])

      // MapPin content for availability
      await ipfsService.pinContent(result.cid)

      toast.success(`Uploaded to IPFS: ${result.cid.slice(0, 10)}...`)
      
      // Clear form
      setContent('')
      setSelectedFile(null)

    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  /**
   * Download and decrypt content from IPFS
   */
  const handleDownload = async (cid: string) => {
    if (!cid.trim()) return

    setDownloading(true)

    try {
      // Get encryption key
      const keyData = localStorage.getItem(`ipfs_key_${cid}`)
      if (!keyData) {
        throw new Error('Encryption key not found')
      }

      const keyJWK = JSON.parse(keyData)
      const encryptionKey = await crypto.subtle.importKey(
        'jwk',
        keyJWK,
        { name: 'AES-GCM' },
        true,
        ['decrypt']
      )

      // Download and decrypt
      const result = await ipfsService.downloadEncrypted(cid, encryptionKey)

      // Display result
      if (typeof result.content === 'string') {
        toast.success('Content downloaded and decrypted successfully')
        console.log('Decrypted content:', result.content)
      } else {
        toast.success('File downloaded successfully')
        // Could create blob URL for file download
      }

    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  /**
   * Demonstrate video call with IPFS signaling
   */
  const demoVideoCall = async () => {
    try {
      const result = await videoCallService.initiateCall(
        'demo.prv',
        'alice.prv',
        {
          video: true,
          audio: true,
          quality: 'hd',
          encryption: true
        }
      )

      if (result.success) {
        toast.success(`VideoCamera call initiated with IPFS signaling: ${result.sessionId}`)
      } else {
        toast.error(result.error || 'VideoCamera call demo failed')
      }
    } catch (_error) {
      toast.error('VideoCamera call demo failed')
    }
  }

  /**
   * Demonstrate email with IPFS storage
   */
  const demoEmail = async () => {
    try {
      const result = await emailService.sendEmail(
        'demo.prv',
        'alice.prv',
        'IPFS Integration Demo',
        'This email is stored on IPFS with end-to-end encryption and anonymous routing. The content is distributed across the decentralized network.',
        []
      )

      if (result.success) {
        toast.success(`Email sent via IPFS: ${result.ipfsCID?.slice(0, 10)}...`)
      } else {
        toast.error(result.error || 'Email failed')
      }
    } catch (_error) {
      toast.error('Email demo failed')
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <VideoCamera className="w-4 h-4" />
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">IPFS Integration Demo</h2>
          <p className="text-muted-foreground">
            Real decentralized storage with Filebase IPFS infrastructure
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Globe className="w-4 h-4" />
          Production IPFS
        </Badge>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudArrowUp className="w-5 h-5" />
            Upload to IPFS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter text content to upload..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Or upload a file:</span>
            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-auto"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading to IPFS...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleUpload}
              disabled={(!content.trim() && !selectedFile) || uploading}
              className="flex items-center gap-2"
            >
              <CloudArrowUp className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Encrypted'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={demoVideoCall}
              className="flex items-center gap-2"
            >
              <VideoCamera className="w-4 h-4" />
              Demo VideoCamera Call
            </Button>
            
            <Button 
              variant="outline"
              onClick={demoEmail}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Demo Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudArrowDown className="w-5 h-5" />
            Download from IPFS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter IPFS CID (e.g., QmX...)"
              value={downloadCID}
              onChange={(e) => setDownloadCID(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => handleDownload(downloadCID)}
              disabled={!downloadCID.trim() || downloading}
              className="flex items-center gap-2"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudArrowDown className="w-4 h-4" />
              )}
              {downloading ? 'Downloading...' : 'Download & Decrypt'}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <Shield className="w-4 h-4 inline mr-1" />
            Content is automatically decrypted using stored encryption keys
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Uploaded Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.cid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {file.cid.slice(0, 20)}... • {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Encrypted
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file.cid)}
                      disabled={downloading}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">IPFS Infrastructure</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Filebase Production Network</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>S3-Compatible API</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Automatic Content Pinning</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Global CDN Distribution</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Encryption & Security</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>AES-256-GCM Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Client-Side Key Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Zero-Knowledge Architecture</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Metadata Protection</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-center text-sm text-muted-foreground">
            <p>All content is encrypted before upload. IPFS provides distributed storage with content-addressed retrieval.</p>
            <p className="mt-1">Integration supports video call signaling, email storage, and file attachments.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}