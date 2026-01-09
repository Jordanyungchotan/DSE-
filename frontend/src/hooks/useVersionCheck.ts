/**
 * 版本检测 Hook
 * 定期检查服务器版本，如有更新则提示用户刷新
 */
import { useEffect, useState, useCallback } from 'react'

interface VersionInfo {
  version: string
  buildTime: string
}

// 存储当前版本的 key
const VERSION_STORAGE_KEY = 'dse-app-version'

// 检查间隔（5分钟）
const CHECK_INTERVAL = 5 * 60 * 1000

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)

  const checkVersion = useCallback(async () => {
    try {
      // 添加随机参数避免缓存
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) return
      
      const serverVersion: VersionInfo = await response.json()
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
      
      setCurrentVersion(serverVersion.version)
      
      if (storedVersion && storedVersion !== serverVersion.version) {
        // 版本不同，需要更新
        console.log(`[版本检测] 发现新版本: ${storedVersion} -> ${serverVersion.version}`)
        setUpdateAvailable(true)
      } else if (!storedVersion) {
        // 首次访问，存储版本
        localStorage.setItem(VERSION_STORAGE_KEY, serverVersion.version)
      }
    } catch (error) {
      console.error('[版本检测] 检查失败:', error)
    }
  }, [])

  const forceUpdate = useCallback(() => {
    // 清除缓存并强制刷新
    if (currentVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    }
    
    // 清除 Service Worker 缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    
    // 强制刷新页面
    window.location.reload()
  }, [currentVersion])

  useEffect(() => {
    // 页面加载时检查
    checkVersion()
    
    // 定期检查
    const interval = setInterval(checkVersion, CHECK_INTERVAL)
    
    // 页面获得焦点时检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion])

  return {
    updateAvailable,
    forceUpdate,
    currentVersion
  }
}
