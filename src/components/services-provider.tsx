import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import { Services } from "@/src/services/services/services"

const ServicesContext = createContext({
  services: new Services(),
})

type ServicesProviderProps = {
  children?: ReactNode;
}
const ServicesProvider = ({ children }: ServicesProviderProps) => {
  const value = useMemo(() => ({ services: new Services() }), []);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}

const useServices = () => {
  return useContext(ServicesContext);
}

export { useServices, ServicesProvider };
