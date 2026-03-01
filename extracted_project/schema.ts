  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cpuUsage: decimal("cpuUsage", { precision: 5, scale: 2 }),
  memoryUsage: decimal("memoryUsage", { precision: 5, scale: 2 }),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  batteryLevel: decimal("batteryLevel", { precision: 5, scale: 2 }),
  operationalMode: mysqlEnum("operationalMode", ["hunting", "raid", "idle", "charging"]).default("idle").notNull(),
  isConnected: boolean("isConnected").default(true).notNull(),
  lastUpdate: timestamp("lastUpdate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("device_status_userId_idx").on(table.userId),
}));

export type DeviceStatus = typeof deviceStatus.$inferSelect;
export type InsertDeviceStatus = typeof deviceStatus.$inferInsert;