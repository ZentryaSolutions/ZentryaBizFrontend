/**
 * Generate device fingerprint and device ID
 * 
 * CRITICAL: Device ID is generated on CLIENT side and stored in localStorage
 * This ensures same device ID whether accessed via web or desktop
 * Same physical device = same device ID = license works on both
 * 
 * Industry-standard approach: Generate UUID once, store it, reuse it
 */

// Cache the fingerprint to avoid regenerating
let cachedFingerprint = null;
let cachedDeviceId = null;

/**
 * Generate device fingerprint (for non-license purposes)
 * Uses browser APIs to create a unique identifier
 */
export function generateDeviceFingerprint() {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    const components = [];

    // Screen properties
    if (window.screen) {
      components.push(
        window.screen.width,
        window.screen.height,
        window.screen.colorDepth,
        window.screen.pixelDepth
      );
    }

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language || navigator.userLanguage);

    // Platform
    components.push(navigator.platform);

    // Hardware concurrency
    if (navigator.hardwareConcurrency) {
      components.push(navigator.hardwareConcurrency);
    }

    // Device memory (if available)
    if (navigator.deviceMemory) {
      components.push(navigator.deviceMemory);
    }

    // Canvas fingerprint (more unique)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('HisaabKitab Device Fingerprint', 2, 2);
      components.push(canvas.toDataURL());
    } catch (e) {
      // Canvas not available, skip
    }

    // WebGL fingerprint (if available)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // WebGL not available, skip
    }

    // Combine all components
    const fingerprintString = components.join('|');

    // Hash the fingerprint (simple hash function)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex string (64 chars for SHA-256-like length)
    const hexHash = Math.abs(hash).toString(16).padStart(16, '0');
    const fullHash = hexHash + Math.abs(hash * 31).toString(16).padStart(16, '0') +
                     Math.abs(hash * 61).toString(16).padStart(16, '0') +
                     Math.abs(hash * 97).toString(16).padStart(16, '0');

    cachedFingerprint = fullHash;
    return fullHash;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback fingerprint
    const fallback = 'fallback_' + Date.now() + '_' + Math.random().toString(36);
    cachedFingerprint = fallback;
    return fallback;
  }
}

/**
 * Generate a random UUID (for device ID)
 * Uses crypto.randomUUID() if available, otherwise generates a UUID v4
 */
function generateUUID() {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get device ID (CLIENT-GENERATED, stored in localStorage)
 * CRITICAL: This is the industry-standard approach
 * - Generated once on first run
 * - Stored in localStorage
 * - Reused on every run
 * - Same device ID whether accessed via web or desktop (if they share storage)
 * 
 * This ensures:
 * ✅ Same physical device = same device ID
 * ✅ License activated from web works on desktop and vice versa
 * ✅ No dependency on backend for device ID generation
 * ✅ Works offline
 */
export function getDeviceId() {
  // Return cached if available
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // Try to get from localStorage (persistent across sessions)
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      // First run: Generate new UUID
      deviceId = generateUUID();
      
      // Store it in localStorage for future use
      localStorage.setItem('device_id', deviceId);
      
      console.log('[Device Fingerprint] Generated new device ID:', deviceId.substring(0, 16) + '...');
    } else {
      console.log('[Device Fingerprint] Using existing device ID from localStorage:', deviceId.substring(0, 16) + '...');
    }
    
    // Cache it
    cachedDeviceId = deviceId;
    return deviceId;
  } catch (error) {
    // If localStorage is not available (rare), generate a temporary ID
    console.warn('[Device Fingerprint] localStorage not available, using temporary ID:', error.message);
    const tempId = generateUUID();
    cachedDeviceId = tempId;
    return tempId;
  }
}

/**
 * Synchronous version of getDeviceId (for backwards compatibility)
 * Same implementation - localStorage access is synchronous
 */
export function getDeviceIdSync() {
  return getDeviceId();
}

/**
 * Async version (for consistency with previous API)
 * Returns immediately since localStorage is synchronous
 */
export async function getDeviceIdAsync() {
  return getDeviceId();
}

/**
 * Clear cached fingerprint and device ID (for testing)
 * NOTE: This does NOT clear localStorage - use clearDeviceId() for that
 */
export function clearFingerprintCache() {
  cachedFingerprint = null;
  cachedDeviceId = null;
}

/**
 * Clear device ID from localStorage (for testing/reset)
 * WARNING: This will require reactivation on next run
 */
export function clearDeviceId() {
  try {
    localStorage.removeItem('device_id');
    cachedDeviceId = null;
    console.log('[Device Fingerprint] Device ID cleared from localStorage');
  } catch (error) {
    console.error('[Device Fingerprint] Error clearing device ID:', error);
  }
}

/**
 * Get device ID without generating a new one (if not exists, returns null)
 * Useful for checking if device ID exists without creating one
 */
export function getExistingDeviceId() {
  try {
    return localStorage.getItem('device_id');
  } catch (error) {
    return null;
  }
}
