import Dexie, { type EntityTable } from 'dexie'
import { InventoryItem } from '../types/inventory'

const db = new Dexie('InventoryDB') as Dexie & {
  inventory: EntityTable<InventoryItem, 'id'>
}

db.version(1).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt'
})

export { db }
