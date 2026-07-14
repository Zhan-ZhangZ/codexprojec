/**
 * Simplified service structure
 */
export interface SimplifiedService {
  id: string;
  name: string;
  description?: string;
  requiredParams?: string[];
  optionalParams?: string[];
}
