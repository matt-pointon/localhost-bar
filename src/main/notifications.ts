import { Notification } from 'electron'
import { getSettings, setSettings } from './settings'

export function areNotificationsEnabled(): boolean {
  return getSettings().notificationsEnabled
}

export function setNotificationsEnabled(enabled: boolean): void {
  setSettings({ notificationsEnabled: enabled })
}

export function notifyServiceOffline(name: string, port: number): void {
  if (!areNotificationsEnabled()) return
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: 'Service offline',
    body: `${name} on :${port} went offline`,
    silent: false
  })
  n.show()
}

export function notifyServiceOnline(name: string, port: number): void {
  if (!areNotificationsEnabled()) return
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: 'Service online',
    body: `${name} is running on :${port}`,
    silent: false
  })
  n.show()
}

export function notifyPortConflict(port: number, names: string[]): void {
  if (!areNotificationsEnabled()) return
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: 'Port conflict',
    body: `Port ${port}: ${names.join(' vs ')}`,
    silent: false
  })
  n.show()
}
