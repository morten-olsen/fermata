import { useMemo } from 'react';

import type { ServiceDependency } from '@/src/services/services/services';

import { useServices } from '@/src/components/services-provider';

const useService = <T>(service: ServiceDependency<T>) => {
  const { services } = useServices();
  const instance = useMemo(() => services.get(service), [service, services]);
  return instance;
}

export { useServiceQuery } from './service.query';
export { useServiceMutation } from './service.mutation';
export { useReactiveList } from './service.reactive-list';
export { useService };
