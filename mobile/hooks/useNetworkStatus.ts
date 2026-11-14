/**
 * 2ndGM — useNetworkStatus
 * Listens for real-time connectivity changes using @react-native-community/netinfo.
 * Returns `isConnected`, `connectionType`, and `isInternetReachable` flags.
 * Strictly typed — no `any` usage.
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, {
  NetInfoState,
  NetInfoStateType,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetworkStatus {
  /** True when the device has an active network connection. */
  isConnected: boolean;
  /**
   * True when the device can actually reach the internet.
   * May be null if undetermined (e.g. on first mount before check completes).
   */
  isInternetReachable: boolean | null;
  /** Raw connection type: wifi | cellular | none | unknown | etc. */
  connectionType: NetInfoStateType;
  /** True while the initial network check is still in-flight. */
  isLoading: boolean;
}

// ─── Default / initial state ──────────────────────────────────────────────────

const DEFAULT_STATUS: NetworkStatus = {
  isConnected: true,      // optimistic default — avoids flash of offline banner
  isInternetReachable: null,
  connectionType: NetInfoStateType.unknown,
  isLoading: true,
};

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapNetInfoState(state: NetInfoState): Omit<NetworkStatus, 'isLoading'> {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    connectionType: state.type,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @example
 * const { isConnected, connectionType } = useNetworkStatus();
 * if (!isConnected) return <OfflineBanner />;
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(DEFAULT_STATUS);

  const handleStateChange = useCallback((state: NetInfoState) => {
    setStatus({
      ...mapNetInfoState(state),
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    let subscription: NetInfoSubscription | undefined;

    // Perform an immediate fetch to get accurate initial state quickly
    NetInfo.fetch()
      .then((state) => {
        setStatus({
          ...mapNetInfoState(state),
          isLoading: false,
        });
      })
      .catch(() => {
        // If fetch itself fails, assume offline for safety
        setStatus({
          isConnected: false,
          isInternetReachable: false,
          connectionType: NetInfoStateType.none,
          isLoading: false,
        });
      });

    // Subscribe to live updates
    subscription = NetInfo.addEventListener(handleStateChange);

    return () => {
      subscription?.();
    };
  }, [handleStateChange]);

  return status;
}

// ─── Convenience selector ─────────────────────────────────────────────────────

/**
 * Lightweight hook — returns only the boolean offline flag.
 * Use when you just need to conditionally render the OfflineBanner.
 */
export function useIsOffline(): boolean {
  const { isConnected, isInternetReachable, isLoading } = useNetworkStatus();
  if (isLoading) return false;
  return !isConnected || isInternetReachable === false;
}
