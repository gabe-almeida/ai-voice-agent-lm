/**
 * Rate limiter utility for API calls
 * Implements a simple token bucket algorithm
 */

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Check if we can make a request
   */
  async canMakeRequest(): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Wait until we can make a request
   */
  async waitForToken(): Promise<void> {
    while (!(await this.canMakeRequest())) {
      // Wait for tokens to refill
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 100)));
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // in seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }
}

// Create rate limiters for different services
// Gemini TTS: Conservative rate limit to avoid 429 errors
export const geminiTTSRateLimiter = new RateLimiter(5, 0.5); // 5 requests max, refill 0.5/second (30/minute)

// Gemini Chat: More generous rate limit
export const geminiChatRateLimiter = new RateLimiter(10, 1); // 10 requests max, refill 1/second (60/minute)