export interface HassDevice {
  id: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  area_id?: string;
  config_entries?: string[];
  disabled_by?: string | null;
  entry_type?: string | null;
  name_by_user?: string | null;
  via_device_id?: string | null;
}
