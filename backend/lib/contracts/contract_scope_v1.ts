export type ContractScope = {
  execution_name: string;
  canon_affecting: boolean;
  active_contracts: string[];
  checkpoints: string[];
};

export {
  CONTRACT_EXECUTION_SCOPES_V1,
  getContractScopeV1,
  assertContractScopeRegistryV1,
} from './contract_scope_v1.mjs';
