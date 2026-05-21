import { settingsAPI } from '../services/api';
import { supabase, isSupabaseBrowserConfigured } from './supabaseClient';

function parseOtherSettings(data) {
  if (!data?.other_app_settings) return null;
  try {
    return typeof data.other_app_settings === 'string'
      ? JSON.parse(data.other_app_settings)
      : data.other_app_settings;
  } catch {
    return null;
  }
}

/** Shop display name + contact for invoices / WhatsApp (Supabase shop name wins over settings). */
export async function fetchShopBranding(activeShopId) {
  let name = '';
  let phone = '';
  let address = '';

  try {
    const response = await settingsAPI.get();
    const data = response.data;
    const other = parseOtherSettings(data);
    if (other?.shop_name) name = String(other.shop_name).trim();
    if (other?.shop_phone) phone = String(other.shop_phone).trim();
    if (other?.shop_address) address = String(other.shop_address).trim();
    if (!name && data?.shop_name) name = String(data.shop_name).trim();
  } catch (e) {
    console.warn('[shopBranding] settings:', e?.message);
  }

  if (isSupabaseBrowserConfigured() && supabase && activeShopId) {
    try {
      const { data: shopRow, error } = await supabase
        .from('shops')
        .select('name, phone, address')
        .eq('id', activeShopId)
        .maybeSingle();
      if (!error && shopRow) {
        if (shopRow.name && String(shopRow.name).trim()) name = String(shopRow.name).trim();
        if (shopRow.phone && String(shopRow.phone).trim()) phone = String(shopRow.phone).trim();
        if (shopRow.address && String(shopRow.address).trim()) address = String(shopRow.address).trim();
      }
    } catch (e) {
      console.warn('[shopBranding] shops:', e?.message);
    }
  }

  return {
    name: name || 'My Shop',
    phone,
    address,
  };
}
