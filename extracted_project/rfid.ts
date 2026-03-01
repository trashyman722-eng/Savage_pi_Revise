import { router, protectedProcedure } from "../_core/trpc";
import { getRFIDManager, DEFAULT_RFID_CONFIG } from "../rfid/rfid-manager";
import { z } from "zod";

const rfidManager = getRFIDManager(DEFAULT_RFID_CONFIG);

export const rfidRouter = router({
  /**
   * Initialize RFID modules
   */
  initialize: protectedProcedure.mutation(async () => {
    try {
      await rfidManager.initialize();
      return { success: true, message: "RFID modules initialized" };
    } catch (error) {
      console.error("[RFID Router] Initialization failed:", error);
      throw error;
    }
  }),

  /**
   * Start RFID scanning
   */
  startScanning: protectedProcedure.mutation(async () => {
    try {
      await rfidManager.startScanning();
      return { success: true, message: "RFID scanning started" };
    } catch (error) {
      console.error("[RFID Router] Failed to start scanning:", error);
      throw error;
    }
  }),

  /**
   * Stop RFID scanning
   */
  stopScanning: protectedProcedure.mutation(async () => {
    try {
      rfidManager.stopScanning();
      return { success: true, message: "RFID scanning stopped" };
    } catch (error) {
      console.error("[RFID Router] Failed to stop scanning:", error);
      throw error;
    }
  }),

  /**
   * Get card history
   */
  getHistory: protectedProcedure.query(async () => {
    try {
      const history = rfidManager.getCardHistory();
      return history;
    } catch (error) {
      console.error("[RFID Router] Failed to get history:", error);
      throw error;
    }
  }),

  /**
   * Get card by UID
   */
  getCardByUID: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ input }) => {
      try {
        const card = rfidManager.getCardByUID(input.uid);
        return card || null;
      } catch (error) {
        console.error("[RFID Router] Failed to get card:", error);
        throw error;
      }
    }),

  /**
   * Clear card history
   */
  clearHistory: protectedProcedure.mutation(async () => {
    try {
      rfidManager.clearCardHistory();
      return { success: true, message: "Card history cleared" };
    } catch (error) {
      console.error("[RFID Router] Failed to clear history:", error);
      throw error;
    }
  }),

  /**
   * Get RFID status
   */
  getStatus: protectedProcedure.query(async () => {
    try {
      const history = rfidManager.getCardHistory();
      return {
        initialized: true,
        scanning: false,
        cardsDetected: history.length,
        lastCard: history.length > 0 ? history[history.length - 1] : null,
      };
    } catch (error) {
      console.error("[RFID Router] Failed to get status:", error);
      throw error;
    }
  }),

  /**
   * Shutdown RFID modules
   */
  shutdown: protectedProcedure.mutation(async () => {
    try {
      await rfidManager.shutdown();
      return { success: true, message: "RFID modules shutdown" };
    } catch (error) {
      console.error("[RFID Router] Shutdown failed:", error);
      throw error;
    }
  }),
});
