import Dexie, { type EntityTable } from 'dexie'
import { InventoryItem, ReorganizationPlan } from '../types/inventory'

const db = new Dexie('InventoryDB') as Dexie & {
  inventory: EntityTable<InventoryItem, 'id'>
  reorganizationPlans: EntityTable<ReorganizationPlan, 'id'>
}

// Version 1: Initial schema
db.version(1).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt'
})

// Version 2: Add settings table for capacity configuration
db.version(2).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt',
  settings: 'key'
})

// Version 3: Add box dimensions table for physical measurements
db.version(3).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt',
  settings: 'key',
  boxDimensions: 'fbpn'
})

// Version 4: Remove floor plans, add reorganization plans
db.version(4).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt',
  settings: 'key',
  boxDimensions: 'fbpn',
  reorganizationPlans: 'id, createdAt'
})

// Version 5: Remove settings and boxDimensions tables (streamlined app)
db.version(5).stores({
  inventory: 'id, location, fbpn, itemType, createdAt, updatedAt',
  settings: null, // Delete table
  boxDimensions: null, // Delete table
  reorganizationPlans: 'id, createdAt'
})

// Version 6: Rename fbpn to partNumber
db.version(6).stores({
  inventory: 'id, location, partNumber, itemType, createdAt, updatedAt',
  reorganizationPlans: 'id, createdAt'
}).upgrade(tx => {
  // Migrate existing data: rename fbpn to partNumber
  return tx.table('inventory').toCollection().modify(item => {
    if (item.fbpn !== undefined) {
      item.partNumber = item.fbpn
      delete item.fbpn
    }
  })
})

// Reorganization plan helper functions
export async function getAllReorgPlans(): Promise<ReorganizationPlan[]> {
  return db.reorganizationPlans.orderBy('createdAt').reverse().toArray()
}

export async function getReorgPlan(id: string): Promise<ReorganizationPlan | undefined> {
  return db.reorganizationPlans.get(id)
}

export async function saveReorgPlan(plan: ReorganizationPlan): Promise<void> {
  await db.reorganizationPlans.put(plan)
}

export async function deleteReorgPlan(id: string): Promise<void> {
  await db.reorganizationPlans.delete(id)
}

export async function getReorgPlansCount(): Promise<number> {
  return db.reorganizationPlans.count()
}

export { db }
