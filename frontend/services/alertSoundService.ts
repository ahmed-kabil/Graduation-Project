/**
 * AlertSoundService
 * 
 * Handles browser system notifications and in-page emergency alarm sounds
 * for critical patient vital alerts.
 * 
 * - Uses the Notification API for native system notifications (with default device sound).
 * - Uses the Web Audio API to synthesize an ICU-monitor-style alarm in the page.
 * - Respects browser autoplay policies by requiring a user gesture to unlock audio.
 * - Singleton — import the shared `alertSoundService` instance.
 */

const AUDIO_UNLOCKED_KEY = 'hospital_audio_unlocked';

class AlertSoundService {
  private audioContext: AudioContext | null = null;
  private alarmOscillators: OscillatorNode[] = [];
  private alarmGainNode: GainNode | null = null;
  private isPlaying = false;
  private autoUnlockAttached = false;

  // ─── Notification API ────────────────────────────────────────────────

  /** Whether the Notification API is available in this browser. */
  isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /** Current permission state, or 'unsupported'. */
  getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission from the user.
   * MUST be called from a user-gesture handler (click / tap).
   */
  async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isNotificationSupported()) return 'unsupported';
    if (Notification.permission !== 'default') return Notification.permission;

    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (err) {
      console.warn('[AlertSound] Permission request failed:', err);
      return 'default';
    }
  }

  /**
   * Show a native system notification.
   * The OS will play the device's default notification sound automatically.
   */
  showSystemNotification(
    title: string,
    body: string,
    options?: { tag?: string }
  ): void {
    if (this.getNotificationPermission() !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: options?.tag || 'vital-alert',        // dedup by tag
        requireInteraction: true,                  // don't auto-dismiss on desktop
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      // Safari iOS and some contexts throw on `new Notification()`
      console.warn('[AlertSound] System notification failed:', err);
    }
  }

  // ─── Web Audio API — Emergency Alarm ─────────────────────────────────

  /**
   * Lazily create / resume the AudioContext.
   * Returns null if Web Audio API is not available.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AlertSound] Web Audio API not supported');
        return null;
      }
      try {
        this.audioContext = new AudioCtx();
      } catch (err) {
        console.warn('[AlertSound] Failed to create AudioContext:', err);
        return null;
      }
    }

    // Resume a suspended context (autoplay restriction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  /**
   * Play an ICU-monitor-style alarm inside the web page.
   *
   * Pattern: three short 880 Hz beeps followed by a pause, repeated
   * for `durationMs` milliseconds (default 5 000 ms).
   *
   * Safe to call multiple times — will not overlap if already playing.
   */
  playEmergencyAlarm(durationMs: number = 5000): void {
    if (this.isPlaying) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;

    // Master gain so we can mute everything instantly on stop
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.30;
    masterGain.connect(ctx.destination);
    this.alarmGainNode = masterGain;

    const now = ctx.currentTime;
    const beepDuration = 0.15;  // length of one beep (seconds)
    const beepGap = 0.10;       // silence between beeps
    const groupGap = 0.50;      // silence between groups
    const beepsPerGroup = 3;
    const groupDuration =
      beepsPerGroup * (beepDuration + beepGap) + groupGap;
    const totalGroups =
      Math.ceil(durationMs / 1000 / groupDuration) + 1;

    for (let g = 0; g < totalGroups; g++) {
      for (let b = 0; b < beepsPerGroup; b++) {
        const startTime =
          now + g * groupDuration + b * (beepDuration + beepGap);
        const endTime = startTime + beepDuration;

        const osc = ctx.createOscillator();
        const envGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 880; // A5 — typical ICU alarm tone

        // Smooth envelope to avoid clicks
        envGain.gain.setValueAtTime(0, startTime);
        envGain.gain.linearRampToValueAtTime(1, startTime + 0.01);
        envGain.gain.setValueAtTime(1, endTime - 0.01);
        envGain.gain.linearRampToValueAtTime(0, endTime);

        osc.connect(envGain);
        envGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(endTime + 0.05);

        this.alarmOscillators.push(osc);
      }
    }

    // Auto-stop after the requested duration
    setTimeout(() => this.stopEmergencyAlarm(), durationMs);
  }

  /** Immediately silence the in-page alarm. */
  stopEmergencyAlarm(): void {
    this.isPlaying = false;

    for (const osc of this.alarmOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.alarmOscillators = [];

    if (this.alarmGainNode) {
      try { this.alarmGainNode.gain.value = 0; } catch {}
      this.alarmGainNode = null;
    }
  }

  /** Whether the alarm is currently playing. */
  getIsAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  // ─── Audio-context unlock helpers ────────────────────────────────────

  /**
   * Resume the AudioContext. Must be called from a user gesture.
   * Also persists a flag so we know the user opted in.
   */
  async unlockAudio(): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('[AlertSound] AudioContext.resume() failed:', err);
      }
    }
    try {
      localStorage.setItem(AUDIO_UNLOCKED_KEY, 'true');
    } catch {}
  }

  /** Whether the user previously unlocked audio. */
  wasAudioUnlocked(): boolean {
    try {
      return localStorage.getItem(AUDIO_UNLOCKED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Attach a one-time global listener that unlocks the AudioContext on
   * the very first user interaction (click / keydown / touchstart).
   *
   * This is the standard pattern recommended by Chrome, Safari, and
   * Firefox for dealing with autoplay restrictions.
   */
  setupAutoUnlock(): void {
    if (this.autoUnlockAttached) return;
    if (typeof document === 'undefined') return;

    this.autoUnlockAttached = true;

    const unlock = () => {
      this.unlockAudio();
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };

    document.addEventListener('click', unlock, { capture: true, once: false });
    document.addEventListener('keydown', unlock, { capture: true, once: false });
    document.addEventListener('touchstart', unlock, { capture: true, once: false });

    // The listeners above use `once: false` because the `unlock` function
    // removes them manually after the first call. This ensures all three
    // are removed together.
  }
}

/** Shared singleton instance. */
export const alertSoundService = new AlertSoundService();
