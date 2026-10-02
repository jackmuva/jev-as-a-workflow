import type { CapabilityCatalog, CapabilityKind, CapabilitySelection } from "../../models/agent";

let selection: CapabilitySelection | null = null;

export const getCapabilitySelection = () => selection;

export const setCapabilitySelection = (next: CapabilitySelection) => {
  selection = next;
};

export const isCapabilityEnabled = (kind: CapabilityKind, name: string) =>
  selection !== null && selection[kind].includes(name);

export const emptyCapabilitySelection = (): CapabilitySelection => ({
  skills: [],
  mcpServers: [],
  userTools: [],
  agentsMd: [],
});

export const isCatalogEmpty = (catalog: CapabilityCatalog) =>
  catalog.skills.length
  + catalog.mcpServers.length
  + catalog.userTools.length
  + catalog.agentsMd.length === 0;
