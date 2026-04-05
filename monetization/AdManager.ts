
export type AdRewardType = 'revive' | 'double_coins' | 'daily_bonus';

type AdCallback = (rewarded: boolean) => void;

export class AdManager {
  private static instance: AdManager | null = null;

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  /**
   * Shows a rewarded ad. Currently a stub that simulates a 3-second countdown.
   * Replace with real ad SDK integration (e.g., Google AdMob H5 / AdSense for Games).
   */
  public showRewardedAd(type: AdRewardType, callback: AdCallback): void {
    console.log(`[AdManager] Showing rewarded ad: ${type}`);
    // Stub: simulate a 3-second ad
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.9);
      font-family: 'Spectral', serif; color: #f59e0b;
    `;

    let remaining = 3;
    const inner = document.createElement('div');
    inner.style.textAlign = 'center';
    inner.innerHTML = `
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.4em; opacity: 0.7;">Rewarded Ad</div>
      <div style="font-size: 64px; font-weight: 900; margin-top: 16px;" id="ad-countdown">${remaining}</div>
      <div style="font-size: 14px; margin-top: 12px; opacity: 0.5;">Your reward awaits...</div>
    `;
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    const countdownEl = inner.querySelector('#ad-countdown')!;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        document.body.removeChild(overlay);
        console.log(`[AdManager] Ad complete, rewarding: ${type}`);
        callback(true);
      } else {
        countdownEl.textContent = String(remaining);
      }
    }, 1000);
  }

  /** Check if ads are available (always true for stub) */
  public isAdAvailable(): boolean {
    return true;
  }
}
