import type { CapabilityCatalog, CapabilityKind, CapabilitySelection } from "../../models/agent";

let selection: CapabilitySelection | null = null;

export const getCapabilitySelection = () => selection;

export const setCapabilitySelection = (next: CapabilitySelection) => {
  selection = next;
};

export const isCapabilityEnabled = (kind: CapabilityKind, name: string) =>
  selection === null || selection[kind].includes(name);

export const selectAllCapabilities = (catalog: CapabilityCatalog): CapabilitySelection => ({
  skills: catalog.skills.map((entry) => entry.name),
  mcpServers: catalog.mcpServers.map((entry) => entry.name),
  userTools: catalog.userTools.map((entry) => entry.name),
});

export const isCatalogEmpty = (catalog: CapabilityCatalog) => catalog.skills.length + catalog.mcpServers.length + catalog.userTools.length === 0;
