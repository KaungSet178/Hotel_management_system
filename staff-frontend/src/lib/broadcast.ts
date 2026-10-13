import { supabase } from '@/lib/supabase';

export const CROSS_TAB_CHANNEL_NAME = 'stayflow_live_cross_tab_channel';
export const REALTIME_TOPIC = 'stayflow-live-broadcast';

export interface LiveBroadcastMessage {
  event: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// Persistent cross-tab broadcast channel
let sharedBc: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    sharedBc = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
  } catch {
    // fallback
  }
}

// Persistent Supabase Realtime broadcast channel
let sharedSbChannel: any = null;
function getSharedSbChannel() {
  if (!sharedSbChannel && supabase) {
    try {
      sharedSbChannel = supabase.channel(REALTIME_TOPIC, {
        config: { broadcast: { self: true } },
      });
      sharedSbChannel.subscribe();
    } catch {
      // ignore
    }
  }
  return sharedSbChannel;
}

/**
 * Dispatches an instant real-time event across:
 * 1. Cross-tab BroadcastChannel (sub-millisecond local tab communication)
 * 2. Supabase Realtime broadcast channel (cloud WebSocket sync)
 * 3. LocalStorage event bus (cross-window fallback)
 */
export function broadcastLiveEvent(event: string, payload: Record<string, unknown> = {}): void {
  const msg: LiveBroadcastMessage = {
    event,
    payload,
    timestamp: Date.now(),
  };

  // 1. Cross-tab BroadcastChannel
  try {
    if (sharedBc) {
      sharedBc.postMessage(msg);
    } else if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
      bc.postMessage(msg);
      setTimeout(() => bc.close(), 100);
    }
  } catch {
    // Ignore BroadcastChannel errors
  }

  // 2. Supabase Realtime Broadcast
  try {
    const ch = getSharedSbChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event,
        payload,
      }).catch(() => {});
    }
  } catch {
    // Ignore Realtime errors
  }

  // 3. LocalStorage storage event fallback
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('stayflow.live_event_bus', JSON.stringify(msg));
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Subscribe to all live events across BroadcastChannel, LocalStorage, and Supabase Broadcast
 */
export function subscribeLiveEvents(callback: (msg: LiveBroadcastMessage) => void): () => void {
  // 1. BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  const onBcMessage = (e: MessageEvent) => {
    if (e.data && typeof e.data === 'object' && e.data.event) {
      callback(e.data as LiveBroadcastMessage);
    }
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
      bc.addEventListener('message', onBcMessage);
    } catch {
      // ignore
    }
  }

  // 2. Window storage listener fallback
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'stayflow.live_event_bus' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.event) {
          callback(parsed);
        }
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  // 3. Supabase Broadcast Channel listener
  let sbChannel: any = null;
  if (supabase) {
    try {
      sbChannel = supabase
        .channel(`sub-${REALTIME_TOPIC}-${Math.random().toString(36).substring(2, 7)}`)
        .on('broadcast', { event: '*' }, (payload) => {
          if (payload && payload.event) {
            callback({
              event: payload.event,
              payload: (payload.payload || {}) as Record<string, unknown>,
              timestamp: Date.now(),
            });
          }
        })
        .subscribe();
    } catch {
      // ignore
    }
  }

  return () => {
    if (bc) {
      bc.removeEventListener('message', onBcMessage);
      bc.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
    if (sbChannel && supabase) {
      supabase.removeChannel(sbChannel);
    }
  };
}
