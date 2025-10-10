import { app } from 'electron'
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

export class ProductionLogger {
  private logDir: string
  private currentLogFile: string
  private maxLogFiles = 5
  private maxLogSizeBytes = 10 * 1024 * 1024 // 10MB

  constructor() {
    // Store logs in user data directory
    this.logDir = join(app.getPath('userData'), 'logs')
    this.currentLogFile = join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`)
  }

  async initialize() {
    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true })
      }

      // Log startup information
      await this.info('system', 'Application starting', {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        isDevelopment: isDev,
        userDataPath: app.getPath('userData')
      })

      console.log('✅ Production logger initialized:', this.logDir)
    } catch (error) {
      console.error('❌ Failed to initialize production logger:', error)
    }
  }

  private async writeToFile(entry: LogEntry) {
    if (isDev) {
      // In development, just use console
      const color = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m', // green
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m', // red
        fatal: '\x1b[41m' // red background
      }[entry.level]

      console.log(
        `${color}[${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}\x1b[0m`,
        entry.data || ''
      )
      return
    }

    try {
      const logLine = JSON.stringify(entry) + '\n'
      await appendFile(this.currentLogFile, logLine, 'utf8')

      // Rotate logs if needed
      await this.rotateLogs()
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private async rotateLogs() {
    try {
      const fs = await import('fs')
      const stats = fs.statSync(this.currentLogFile)

      if (stats.size > this.maxLogSizeBytes) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedFile = join(this.logDir, `app-${timestamp}.log`)

        // Rename current log
        fs.renameSync(this.currentLogFile, rotatedFile)

        // Start new log file
        this.currentLogFile = join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`)

        // Clean up old log files
        await this.cleanupOldLogs()
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error)
    }
  }

  private async cleanupOldLogs() {
    try {
      const fs = await import('fs')
      const files = fs.readdirSync(this.logDir)
      const logFiles = files
        .filter((file) => file.endsWith('.log'))
        .map((file) => ({
          name: file,
          path: join(this.logDir, file),
          mtime: fs.statSync(join(this.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      // Keep only the most recent files
      if (logFiles.length > this.maxLogFiles) {
        for (const file of logFiles.slice(this.maxLogFiles)) {
          fs.unlinkSync(file.path)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  async debug(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      category,
      message,
      data
    }
    await this.writeToFile(entry)
  }

  async info(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category,
      message,
      data
    }
    await this.writeToFile(entry)
  }

  async warn(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      category,
      message,
      data
    }
    await this.writeToFile(entry)
  }

  async error(category: string, message: string, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message,
      data: error?.message || error,
      stack: error?.stack
    }
    await this.writeToFile(entry)
  }

  async fatal(category: string, message: string, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      category,
      message,
      data: error?.message || error,
      stack: error?.stack
    }
    await this.writeToFile(entry)
  }

  // Diagnostic methods
  async logSystemInfo() {
    await this.info('system', 'System diagnostics', {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appVersion: app.getVersion(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      ppid: process.ppid,
      cwd: process.cwd(),
      userDataPath: app.getPath('userData'),
      logsPath: app.getPath('logs'),
      tempPath: app.getPath('temp'),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE,
        VITE_API_URL: process.env.VITE_API_URL ? 'configured' : 'not configured'
      }
    })
  }

  async logAppState(services: {
    trayService?: boolean
    backgroundDataService?: boolean
    captureService?: boolean
    transcriptionService?: boolean
    mainWindow?: boolean
  }) {
    await this.info('app-state', 'Application state snapshot', {
      timestamp: new Date().toISOString(),
      services,
      windows: {
        allWindows: require('electron').BrowserWindow.getAllWindows().length,
        visibleWindows: require('electron')
          .BrowserWindow.getAllWindows()
          .filter((w: any) => w.isVisible()).length
      }
    })
  }
}

// Global logger instance
export const logger = new ProductionLogger()

// Utility functions for common logging patterns
export const logServiceStart = (serviceName: string, details?: any) =>
  logger.info('service', `${serviceName} starting`, details)

export const logServiceReady = (serviceName: string, details?: any) =>
  logger.info('service', `${serviceName} ready`, details)

export const logServiceError = (serviceName: string, error: any) =>
  logger.error('service', `${serviceName} error`, error)

export const logServiceStop = (serviceName: string, details?: any) =>
  logger.info('service', `${serviceName} stopping`, details)

export const logIpcCall = (channel: string, direction: 'send' | 'receive', data?: any) =>
  logger.debug('ipc', `${direction} ${channel}`, data)

export const logCaptureEvent = (event: string, details?: any) =>
  logger.info('capture', event, details)

export const logTrayEvent = (event: string, details?: any) => logger.debug('tray', event, details)
