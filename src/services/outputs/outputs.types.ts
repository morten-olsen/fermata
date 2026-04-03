type OutputConfig = {
  id: string;
  type: string;
  name: string;
  config: Record<string, string>;
  createdAt: string;
};

type OutputConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type OutputEntity = {
  entityId: string;
  name: string;
  state: string;
};

type Speaker = OutputEntity & {
  outputId: string;
  outputName: string;
};

type ActiveTarget = {
  outputId: string;
  entityId: string;
};

type OutputsServiceEvents = {
  speakersChanged: () => void;
  activeTargetChanged: () => void;
  connectionStateChanged: () => void;
  configChanged: () => void;
};

export type {
  OutputConfig,
  OutputConnectionState,
  OutputEntity,
  Speaker,
  ActiveTarget,
  OutputsServiceEvents,
};
