import { supabase } from './supabase';

export type VpsProtocol = 'SSH' | 'VNC' | 'RDP';
export type VpsStatus = 'online' | 'offline' | 'pending' | 'error';


export interface VpsInstance {
  id: number;
  name: string;
  ip: string;
  port: number;
  http_proxy: string;
  protocol: VpsProtocol;
  status: VpsStatus;
  active_sessions: number;
  total_cookies: number;
  error_cookies: number;
  password?: string | null;
  created_at?: string;
}

export interface NewVpsPayload {
  name: string;
  ip: string;
  port: number;
  http_proxy: string;
  protocol: VpsProtocol;
  status: VpsStatus;
  active_sessions: number;
  total_cookies: number;
  error_cookies: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map port number -> Protocol */
export function inferProtocol(port: number): VpsProtocol {
  if (port === 3389) return 'RDP';
  if (port === 5900 || port === 5901) return 'VNC';
  return 'SSH'; // port 22 và default
}

/**
 * Parse chuỗi proxy (có thể dạng http://ip:port hoặc ip:port)
 * Trả về { ip, port }
 */
export function parseProxy(raw: string): { ip: string; port: number } {
  // Bỏ scheme nếu có
  const cleaned = raw.replace(/^https?:\/\//, '');
  const lastColon = cleaned.lastIndexOf(':');
  if (lastColon === -1) return { ip: cleaned, port: 22 };
  const ip = cleaned.slice(0, lastColon);
  const port = parseInt(cleaned.slice(lastColon + 1), 10) || 22;
  return { ip, port };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchVpsInstances(): Promise<VpsInstance[]> {
  const { data, error } = await supabase
    .from('vps_instances')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VpsInstance[];
}

export async function createVpsInstance(payload: NewVpsPayload): Promise<VpsInstance> {
  const { data, error } = await supabase
    .from('vps_instances')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as VpsInstance;
}

export async function deleteVpsInstance(id: number): Promise<void> {
  const { error } = await supabase.from('vps_instances').delete().eq('id', id);
  if (error) throw error;
}

export interface UpdateVpsPayload {
  name: string;
  ip: string;
  port: number;
  http_proxy: string;
  protocol: VpsProtocol;
}

export async function updateVpsInstance(id: number, payload: Partial<UpdateVpsPayload>): Promise<VpsInstance> {
  const { data, error } = await supabase
    .from('vps_instances')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as VpsInstance;
}


// ── Cookies CRUD ─────────────────────────────────────────────────────────────

export interface VpsCookie {
  id: number;
  vps_id: number;
  email: string;
  cookie_json: string;
  status: 'active' | 'inactive' | 'error';
  created_at?: string;
}

export interface NewVpsCookiePayload {
  vps_id: number;
  email: string;
  cookie_json: string;
  status: 'active' | 'inactive' | 'error';
}

export async function fetchVpsCookies(vpsId: number): Promise<VpsCookie[]> {
  const { data, error } = await supabase
    .from('vps_cookies')
    .select('*')
    .eq('vps_id', vpsId)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VpsCookie[];
}

export async function createVpsCookie(payload: NewVpsCookiePayload): Promise<VpsCookie> {
  const { data, error } = await supabase
    .from('vps_cookies')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as VpsCookie;
}

export async function deleteVpsCookie(id: number): Promise<void> {
  const { error } = await supabase.from('vps_cookies').delete().eq('id', id);
  if (error) throw error;
}

export async function updateVpsStatus(id: number, status: VpsStatus): Promise<void> {
  const { error } = await supabase
    .from('vps_instances')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}


