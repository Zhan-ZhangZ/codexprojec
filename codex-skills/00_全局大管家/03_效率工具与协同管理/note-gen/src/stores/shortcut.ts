import { create } from 'zustand';
import { Store } from "@tauri-apps/plugin-store";
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import emitter from '@/lib/emitter';

interface Shortcut {
  key: string,
  value: string,
}

interface SettingState {
  shortcuts: Shortcut[],
  initShortcut: () => Promise<void>,
  setShortcut: (key: string, value: string) => Promise<void>,
  resetDefault: (key: string) => Promise<void>,
}

const defaultShortcuts: Shortcut[] = [
  {
    key: "openWindow",
    value: "CommandOrControl+Shift+W"
  },
  {
    key: 'screenshotRecord',
    value: 'CommandOrControl+Shift+S'
  },
  {
    key: 'quickRecordText',
    value: 'CommandOrControl+Shift+T'
  }
]

function emitShortcutEvent(key: string) {
  if (key === 'screenshotRecord') {
    emitter.emit('toolbar-shortcut-scan')
    return
  }

  emitter.emit(key)
}

async function bindShortcuts(shortcuts: Shortcut[]) {
  await unregisterAll()

  const registeredValues = new Set<string>()

  for (const shortcut of shortcuts) {
    try {
      if (shortcut.value && !registeredValues.has(shortcut.value)) {
        await register(shortcut.value, (event) => {
        if (event.state === 'Pressed') {
            emitShortcutEvent(shortcut.key)
        }
      });
        registeredValues.add(shortcut.value)
      }
    } catch (error) {
      console.error(`Failed to register shortcut ${shortcut.value}:`, error);
    }
  }
}

const useShortcutStore = create<SettingState>((set, get) => ({
  shortcuts: [],

  initShortcut: async () => {
    const store = await Store.load('store.json');
    const shortcuts = await store.get<Shortcut[]>('shortcuts')
    if (shortcuts && shortcuts.length) {
      const mergeShortcuts = defaultShortcuts.map((shortcut) => {
        const existShortcut = shortcuts.find((shortcutItem) => shortcutItem.key === shortcut.key)
        if (existShortcut) {
          return existShortcut
        } else {
          return shortcut
        }
      })
      set({ shortcuts: mergeShortcuts })
      await bindShortcuts(mergeShortcuts)
    } else {
      await store.set('shortcuts', defaultShortcuts)
      set({ shortcuts: defaultShortcuts })
      await bindShortcuts(defaultShortcuts)
    }
  },

  setShortcut: async (key: string, value: string) => {
    const store = await Store.load('store.json');
    const newShortcuts = get().shortcuts.map((shortcut) => {
      if (shortcut.key === key) {
        return { ...shortcut, value }
      }
      return shortcut
    })
    await store.set('shortcuts', newShortcuts)
    set({ shortcuts: newShortcuts })
    await bindShortcuts(newShortcuts)
  },

  resetDefault: async (key: string) => {
    const store = await Store.load('store.json');
    const newShortcuts = get().shortcuts.map((shortcut) => {
      if (shortcut.key === key) {
        return { ...shortcut, value: defaultShortcuts.find((shortcut) => shortcut.key === key)?.value || '' }
      }
      return shortcut
    })
    await store.set('shortcuts', newShortcuts)
    set({ shortcuts: newShortcuts })
    await bindShortcuts(newShortcuts)
  },
}))

export default useShortcutStore
