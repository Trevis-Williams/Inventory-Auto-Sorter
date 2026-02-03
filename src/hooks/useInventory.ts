import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../lib/db'
import { InventoryItem, NewInventoryItem } from '../types/inventory'

export function useInventory() {
  const items = useLiveQuery(() => db.inventory.toArray()) ?? []

  const addItem = async (item: NewInventoryItem): Promise<string> => {
    const now = new Date()
    const id = uuidv4()
    await db.inventory.add({
      id,
      ...item,
      createdAt: now,
      updatedAt: now,
    })
    return id
  }

  const addItems = async (newItems: NewInventoryItem[]): Promise<void> => {
    const now = new Date()
    const itemsToAdd: InventoryItem[] = newItems.map(item => ({
      id: uuidv4(),
      ...item,
      createdAt: now,
      updatedAt: now,
    }))
    await db.inventory.bulkAdd(itemsToAdd)
  }

  const updateItem = async (id: string, updates: Partial<NewInventoryItem>): Promise<void> => {
    await db.inventory.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  }

  const deleteItems = async (ids: string[]): Promise<void> => {
    await db.inventory.bulkDelete(ids)
  }

  const clearAll = async (): Promise<void> => {
    await db.inventory.clear()
  }

  const getItem = async (id: string): Promise<InventoryItem | undefined> => {
    return db.inventory.get(id)
  }

  return {
    items,
    addItem,
    addItems,
    updateItem,
    deleteItems,
    clearAll,
    getItem,
  }
}
