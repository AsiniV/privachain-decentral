/**
 * Example demonstrating the Tauri dpi_fetch command usage
 * 
 * This file shows how to use the dpi_fetch command from the Tauri backend.
 * In a real Tauri desktop application, this would work out of the box.
 * 
 * Note: This is a demonstration file and won't run in a web browser context.
 * It requires the Tauri desktop runtime.
 */

// In a real Tauri app, the __TAURI__ global is injected automatically
declare global {
  interface Window {
    __TAURI__?: {
      tauri: {
        invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
      }
    }
  }
}

/**
 * Example response structure from dpi_fetch
 */
interface DpiFetchResult {
  status: number
  headers: [string, string][]
  body: number[]
}

/**
 * Example: Fetch a URL using the Tauri dpi_fetch command
 */
async function exampleDpiFetch() {
  // Check if we're in a Tauri environment
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.log('Not running in Tauri environment')
    return
  }

  const { invoke } = window.__TAURI__.tauri

  try {
    console.log('Fetching https://example.com with DPI bypass...')
    
    // Call the dpi_fetch command
    const result = await invoke<DpiFetchResult>('dpi_fetch', {
      url: 'https://example.com',
      tor: false // Set to true to route through Tor
    })

    console.log('Status:', result.status)
    console.log('Headers:', result.headers)
    
    // Convert body from number array to text
    const bodyText = new TextDecoder().decode(new Uint8Array(result.body))
    console.log('Body length:', bodyText.length)
    console.log('Body preview:', bodyText.substring(0, 200))

    return result
  } catch (error) {
    console.error('DPI fetch failed:', error)
    throw error
  }
}

/**
 * Example: Fetch through Tor
 */
async function exampleTorFetch() {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.log('Not running in Tauri environment')
    return
  }

  const { invoke } = window.__TAURI__.tauri

  try {
    console.log('Fetching through Tor SOCKS proxy...')
    
    const result = await invoke<DpiFetchResult>('dpi_fetch', {
      url: 'https://check.torproject.org/',
      tor: true // Route through Tor
    })

    const bodyText = new TextDecoder().decode(new Uint8Array(result.body))
    
    if (bodyText.includes('Congratulations')) {
      console.log('✓ Successfully connected through Tor!')
    } else {
      console.log('⚠ May not be using Tor connection')
    }

    return result
  } catch (error) {
    console.error('Tor fetch failed. Is Tor running on 127.0.0.1:9050?', error)
    throw error
  }
}

/**
 * Example: Fetch with error handling
 */
async function exampleWithErrorHandling() {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.log('Not running in Tauri environment')
    return
  }

  const { invoke } = window.__TAURI__.tauri

  const urls = [
    'https://example.com',
    'https://httpstat.us/404', // Will return 404
    'https://httpstat.us/500', // Will return 500
    'https://invalid-url-that-does-not-exist.com' // Will fail
  ]

  for (const url of urls) {
    try {
      console.log(`\nFetching: ${url}`)
      const result = await invoke<DpiFetchResult>('dpi_fetch', {
        url,
        tor: false
      })
      
      if (result.status >= 200 && result.status < 300) {
        console.log(`✓ Success: ${result.status}`)
      } else {
        console.log(`⚠ HTTP ${result.status}`)
      }
    } catch (error) {
      console.error(`✗ Failed: ${error}`)
    }
  }
}

// Export examples for use
export { exampleDpiFetch, exampleTorFetch, exampleWithErrorHandling }

// If running as a script, execute examples
if (typeof window !== 'undefined' && window.__TAURI__) {
  console.log('=== Tauri DPI Fetch Examples ===\n')
  
  exampleDpiFetch()
    .then(() => exampleWithErrorHandling())
    .catch(err => console.error('Example failed:', err))
}
