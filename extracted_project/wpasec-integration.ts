import * as fs from "fs";
import FormData from "form-data";
import axios, { AxiosInstance } from "axios";

/**
 * WPA-Sec Integration
 * Handles remote handshake cracking via wpa-sec.com API
 */

export interface WpaSecJob {
  jobId: string;
  bssid: string;
  ssid: string;
  status: "pending" | "processing" | "completed" | "failed";
  uploadedAt: Date;
  completedAt?: Date;
  password?: string;
  errorMessage?: string;
}

export class WpaSecIntegration {
  private apiClient: AxiosInstance;
  private apiUrl = "https://wpa-sec.stanev.org/api";
  private jobs: Map<string, WpaSecJob> = new Map();

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
    });
  }

  /**
   * Upload handshake to wpa-sec for cracking
   */
  async uploadHandshake(
    filePath: string,
    bssid: string,
    ssid: string
  ): Promise<WpaSecJob> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Handshake file not found: ${filePath}`);
      }

      const fileStream = fs.createReadStream(filePath);
      const form = new FormData();

      form.append("file", fileStream);
      form.append("bssid", bssid);
      form.append("ssid", ssid);

      const response = await this.apiClient.post("/upload", form, {
        headers: form.getHeaders(),
      });

      const jobId = response.data.job_id || response.data.id;

      if (!jobId) {
        throw new Error("No job ID returned from wpa-sec");
      }

      const job: WpaSecJob = {
        jobId,
        bssid,
        ssid,
        status: "pending",
        uploadedAt: new Date(),
      };

      this.jobs.set(jobId, job);

      console.log(
        `[WpaSec] Uploaded handshake ${bssid} (${ssid}) with job ID: ${jobId}`
      );

      return job;
    } catch (error) {
      console.error("[WpaSec] Upload failed:", error);
      throw error;
    }
  }

  /**
   * Check job status
   */
  async checkJobStatus(jobId: string): Promise<WpaSecJob | null> {
    try {
      const response = await this.apiClient.get(`/job/${jobId}`);

      const job = this.jobs.get(jobId);

      if (!job) {
        return null;
      }

      // Update job status
      job.status = response.data.status || "processing";

      if (response.data.password) {
        job.password = response.data.password;
        job.status = "completed";
        job.completedAt = new Date();
      }

      if (response.data.error) {
        job.errorMessage = response.data.error;
        job.status = "failed";
      }

      this.jobs.set(jobId, job);

      return job;
    } catch (error) {
      console.error(`[WpaSec] Failed to check job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string): Promise<string | null> {
    try {
      const response = await this.apiClient.get(`/result/${jobId}`);

      if (response.data.password) {
        const job = this.jobs.get(jobId);
        if (job) {
          job.password = response.data.password;
          job.status = "completed";
          job.completedAt = new Date();
          this.jobs.set(jobId, job);
        }

        return response.data.password;
      }

      return null;
    } catch (error) {
      console.error(`[WpaSec] Failed to get result for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Poll for job completion
   */
  async pollJobCompletion(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const job = await this.checkJobStatus(jobId);

      if (!job) {
        console.warn(`[WpaSec] Job ${jobId} not found`);
        return null;
      }

      if (job.status === "completed" && job.password) {
        console.log(
          `[WpaSec] Job ${jobId} completed with password: ${job.password}`
        );
        return job.password;
      }

      if (job.status === "failed") {
        console.error(
          `[WpaSec] Job ${jobId} failed: ${job.errorMessage || "Unknown error"}`
        );
        return null;
      }

      if (i < maxAttempts - 1) {
        console.log(
          `[WpaSec] Job ${jobId} still processing... (${i + 1}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    console.warn(`[WpaSec] Job ${jobId} polling timeout after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): WpaSecJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): WpaSecJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get completed jobs
   */
  getCompletedJobs(): WpaSecJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === "completed");
  }

  /**
   * Get pending jobs
   */
  getPendingJobs(): WpaSecJob[] {
    return Array.from(this.jobs.values()).filter(
      (j) => j.status === "pending" || j.status === "processing"
    );
  }

  /**
   * Cancel job (if supported by wpa-sec)
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.apiClient.post(`/cancel/${jobId}`);

      const job = this.jobs.get(jobId);
      if (job) {
        job.status = "failed";
        job.errorMessage = "Cancelled by user";
      }

      return true;
    } catch (error) {
      console.error(`[WpaSec] Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = Array.from(this.jobs.values());

    return {
      total: all.length,
      pending: all.filter((j) => j.status === "pending").length,
      processing: all.filter((j) => j.status === "processing").length,
      completed: all.filter((j) => j.status === "completed").length,
      failed: all.filter((j) => j.status === "failed").length,
      cracked: all.filter((j) => j.password).length,
    };
  }
}

// Singleton instance
let instance: WpaSecIntegration | null = null;

/**
 * Get WpaSec integration instance
 */
export function getWpaSecIntegration(): WpaSecIntegration {
  if (!instance) {
    instance = new WpaSecIntegration();
  }
  return instance;
}
