/**
 * Generates a 16-digit jobId with timestamp and random components
 * Format: [12-digit timestamp][4-digit random]
 * @returns A string containing exactly 16 digits
 */
export function generateJobId(): string {
  // First 12 digits: timestamp (last 12 digits of Date.now())
  const timestamp = Date.now() % 1000000000000; // Get last 12 digits
  const timestampPadded = timestamp.toString().padStart(12, '0');

  // Last 4 digits: random number (0000-9999)
  const random = Math.floor(Math.random() * 10000); // 0 to 9999
  const randomPadded = random.toString().padStart(4, '0');

  // Combine: 12 digit timestamp + 4 digit random
  return timestampPadded + randomPadded;
}
