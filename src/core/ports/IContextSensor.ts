import { NodeProfile } from '../domain/identity/models/NodeProfile';

export interface GeoLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

export interface ContextData {
    nodeId: string;
    timestamp: number;
    location?: GeoLocation;
    networkSSID?: string;
    batteryLevel?: number;
    isOnline: boolean;
}

/**
 * Interface for hardware/environment sensors.
 * "Where am I? And what can I do right now?"
 */
export interface IContextSensor {
    getCurrentContext(): Promise<ContextData>;
    getNodeProfile(): NodeProfile;
}
