import { useCallback } from "react";

import { OutputsService } from "@/src/services/outputs/outputs.service";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";

// ── State hooks ───────────────────────────────────────

const useOutputSpeakers = () => {
  const service = useService(OutputsService);
  const query = useCallback(() => Promise.resolve(service.getSpeakers()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['speakersChanged'],
  });
};

const useActiveTarget = () => {
  const service = useService(OutputsService);
  const query = useCallback(() => Promise.resolve(service.getActiveTarget()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['activeTargetChanged'],
  });
};

const useOutputConnectionState = () => {
  const service = useService(OutputsService);
  const query = useCallback(() => Promise.resolve(service.getConnectionState()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['connectionStateChanged'],
  });
};

const useOutputConfigs = () => {
  const service = useService(OutputsService);
  const query = useCallback(() => Promise.resolve(service.getOutputs()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['configChanged'],
  });
};

// ── Action hooks ──────────────────────────────────────

const useSetActiveSpeaker = () => {
  const service = useService(OutputsService);
  return useServiceMutation(
    (params: { outputId: string; entityId: string }) =>
      service.setActiveSpeaker(params.outputId, params.entityId),
  );
};

const useSetLocalActive = () => {
  const service = useService(OutputsService);
  return useServiceMutation(() => service.setLocalActive());
};

const useAddOutput = () => {
  const service = useService(OutputsService);
  return useServiceMutation(
    (params: { type: string; name: string; config: Record<string, string> }) =>
      service.addOutput(params.type, params.name, params.config),
  );
};

const useRemoveOutput = () => {
  const service = useService(OutputsService);
  return useServiceMutation(service.removeOutput);
};

export {
  useOutputSpeakers,
  useActiveTarget,
  useOutputConnectionState,
  useOutputConfigs,
  useSetActiveSpeaker,
  useSetLocalActive,
  useAddOutput,
  useRemoveOutput,
};
