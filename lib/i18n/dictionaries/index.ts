// Merged Arabic dictionary. Each area owns one file; later spreads win on duplicate keys.
import { core } from "./core";
import { product } from "./product";
import { geo } from "./geo";
import { ministry } from "./ministry";
import { onboarding } from "./onboarding";
import { trade } from "./trade";
import { marketplace } from "./marketplace";
import { servicesCompliance } from "./services-compliance";
import { servicesCommercial } from "./services-commercial";
import { servicesOperations } from "./services-operations";
import { servicesPeopleBrand } from "./services-people-brand";
import { servicesStrategy } from "./services-strategy";
import { solutions } from "./solutions";
import { twin } from "./twin";
import { landing } from "./landing";
import { contextual } from "./context";

export const AR: Record<string, string> = {
  ...core,
  ...product,
  ...geo,
  ...ministry,
  ...onboarding,
  ...trade,
  ...marketplace,
  ...servicesCompliance,
  ...servicesCommercial,
  ...servicesOperations,
  ...servicesPeopleBrand,
  ...servicesStrategy,
  ...solutions,
  ...twin,
  ...landing,
  ...contextual,
};
