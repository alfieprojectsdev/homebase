export type NodeRole = 'mothership' | 'satellite' | 'mobile';

export type NodeCapability = 'gpu' | 'gps' | 'camera' | 'display' | 'sensor_array';

export interface NodeProfile {
    nodeId: string;
    role: NodeRole;
    capabilities: NodeCapability[];

    // Metadata for distributed mesh awareness
    isOfflineCapable: boolean;
    lastSyncTimestamp?: number;
}
