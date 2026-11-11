import {createBackendClient} from '../supabase_backend_client.mjs';
import {SquareCatalogService, squareEnvironmentConfig} from './service_v1.mjs';
import {SquareApiError} from './client_v1.mjs';

export function createSquareBackendService({client, config = squareEnvironmentConfig()} = {}) {
  if (!client) {
    const target = process.env.SUPABASE_URL;
    if (target !== 'http://127.0.0.1:61841' && !(target === 'https://ycdxbpibncqcchqiihfz.supabase.co' && process.env.NODE_ENV === 'production')) {
      throw new SquareApiError('square_database_target_unqualified');
    }
    client = createBackendClient();
  }
  const rpc = async (action, data) => {
    const result = action === 'defer' ? await client.rpc('square_connection_defer_v1', {
      p_connection:data.connectionId,p_owner:data.ownerId,p_token:data.leaseToken,p_fence:data.fence,p_seconds:data.seconds})
      : action === 'authorization_failed' ? await client.rpc('square_connection_authorization_failed_v1', {
        p_connection:data.connectionId,p_owner:data.ownerId,p_token:data.leaseToken,p_fence:data.fence})
      : await client.rpc(config.commerceEnabled ? 'square_commerce_service_v2' : 'square_service_v1', {p_action: action, p_data: data});
    if (result.error) {
      const code = /^square_[a-z_]{1,80}$/.test(result.error.message) ? result.error.message : 'square_state_unavailable';
      throw new SquareApiError(code);
    }
    if (['defer','authorization_failed'].includes(action)) return {recorded:true};
    if (!result.data || typeof result.data !== 'object') throw new SquareApiError('square_state_unavailable');
    return result.data;
  };
  return new SquareCatalogService({rpc, config});
}
