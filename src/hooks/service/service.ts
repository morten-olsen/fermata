import { useMemo } from 'react';

import { useServices } from '@/src/features/services/services';

import type { ServiceDependency } from '@/src/services/services/services';

const useService = <T>(service: ServiceDependency<T>) => {
  const { services } = useServices();
  const instance = useMemo(() => services.get(service), [service, services]);
  return instance;
}

export { useServiceQuery } from './service.query';
export { useServiceMutation } from './service.mutation';
export { useService };
