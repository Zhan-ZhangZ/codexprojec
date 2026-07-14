/**
 * Data transformation system for simplifying Home Assistant API responses
 */

import type { HassEntity } from "./types/entities/entity.types";
import type { HassService } from "./types/services/service.types";
import type { transforms } from './types/transforms/types';

/**
 * Simplified entity structure with essential information
 */
export interface SimplifiedEntity {
  id: string;
  name: string;
  state: string;
  type: string;
  updateTime: string;
  mainAttributes: Record<string, unknown>;
}

/**
 * Generic transformer for Home Assistant data
 */
export class Transformer<T, R> {
  private rules: transforms.Rule<T, R>[] = [];
  private defaultTransform?: (item: T) => R;

  /**
   * Add a transformation rule
   */
  addRule(rule: transforms.Rule<T, R>): void {
    this.rules.push(rule);
  }

  /**
   * Set the default transformation for items not matching any rule
   */
  setDefaultTransform(transform: (item: T) => R): void {
    this.defaultTransform = transform;
  }

  /**
   * Transform a single item using the applicable rule
   */
  transform(item: T): R | null {
    // Find the first matching rule
    for (const rule of this.rules) {
      if (this.matchesRule(item, rule.selector)) {
        return rule.transform(item);
      }
    }

    // Use default transform if provided
    if (this.defaultTransform) {
      return this.defaultTransform(item);
    }

    // No matching rule or default transform
    return null;
  }

  /**
   * Transform a collection of items
   */
  transformAll(items: T[]): (R | null)[] {
    return items.map((item) => this.transform(item));
  }

  /**
   * Check if an item matches a selector
   */
  private matchesRule(
    item: T,
    selector: string | RegExp | ((item: T) => boolean),
  ): boolean {
    if (typeof selector === "function") {
      return selector(item);
    }

    // For string or RegExp selectors, assume items have an 'id' or similar field
    const itemWithId = item as unknown as {
      id?: string;
      entity_id?: string;
      domain?: string;
    };
    const idField = itemWithId.id || itemWithId.entity_id || itemWithId.domain;

    if (!idField) return false;

    if (typeof selector === "string") {
      return idField === selector;
    }

    return selector.test(idField);
  }
}

/**
 * Entity transformer that simplifies Home Assistant entities
 */
export class EntityTransformer extends Transformer<HassEntity, transforms.SimplifiedEntity> {
  constructor() {
    super();
    this.setDefaultTransform(this.defaultEntityTransform.bind(this));
    this.setupEntityRules();
  }

  /**
   * Setup entity-specific transformation rules
   */
  private setupEntityRules(): void {
    this.addRule({
      selector: (entity: HassEntity) => entity.entity_id.startsWith("light."),
      transform: (entity: HassEntity) => {
        const common = this.defaultEntityTransform(entity);
        return {
          ...common,
          mainAttributes: {
            ...common.mainAttributes,
            brightness: entity.attributes["brightness"],
            color: entity.attributes["rgb_color"] || entity.attributes["hs_color"],
            colorTemp: entity.attributes["color_temp"],
            isOn: entity.state === "on",
          },
        };
      },
    });

    this.addRule({
      selector: (entity: HassEntity) => entity.entity_id.startsWith("sensor."),
      transform: (entity: HassEntity) => {
        const common = this.defaultEntityTransform(entity);
        return {
          ...common,
          mainAttributes: {
            ...common.mainAttributes,
            value: entity.state,
            unit: entity.attributes["unit_of_measurement"],
            deviceClass: entity.attributes["device_class"],
            accuracy: entity.attributes["accuracy"],
          },
        };
      },
    });

    this.addRule({
      selector: (entity: HassEntity) => entity.entity_id.startsWith("climate."),
      transform: (entity: HassEntity) => {
        const common = this.defaultEntityTransform(entity);
        return {
          ...common,
          mainAttributes: {
            ...common.mainAttributes,
            currentTemp: entity.attributes["current_temperature"],
            targetTemp: entity.attributes["temperature"],
            mode: entity.attributes["hvac_mode"],
            action: entity.attributes["hvac_action"],
            presets: entity.attributes["preset_modes"],
          },
        };
      },
    });
  }

  /**
   * Default transform for any entity type
   */
  private defaultEntityTransform(entity: HassEntity): transforms.SimplifiedEntity {
    const [domain, id] = entity.entity_id.split(".");
    const friendlyName =
      typeof entity.attributes["friendly_name"] === "string"
        ? entity.attributes["friendly_name"]
        : id;

    return {
      id: entity.entity_id,
      name: friendlyName,
      state: entity.state,
      type: domain,
      updateTime: entity.last_updated || entity.last_changed || new Date().toISOString(),
      mainAttributes: {
        icon: entity.attributes["icon"],
        unitOfMeasurement: entity.attributes["unit_of_measurement"],
      },
    };
  }

  /**
   * Create a simple view of all entities
   */
  createEntitySummary(entities: HassEntity[]): transforms.SimplifiedEntity[] {
    return this.transformAll(entities).filter(Boolean) as transforms.SimplifiedEntity[];
  }

  /**
   * Group entities by domain
   */
  groupByDomain(entities: HassEntity[]): Record<string, transforms.SimplifiedEntity[]> {
    const result: Record<string, transforms.SimplifiedEntity[]> = {};

    for (const entity of entities) {
      const transformed = this.transform(entity);
      if (!transformed) continue;

      const domain = transformed.type;

      if (!result[domain]) {
        result[domain] = [];
      }

      result[domain].push(transformed);
    }

    return result;
  }
}

/**
 * Service transformer that simplifies Home Assistant services
 */
export class ServiceTransformer extends Transformer<HassService, transforms.SimplifiedService> {
  constructor() {
    super();
    this.setDefaultTransform(this.defaultServiceTransform.bind(this));
  }

  private defaultServiceTransform(service: HassService): transforms.SimplifiedService {
    const { domain, service: serviceId = '', fields = {} } = service;

    return {
      id: `${domain}.${serviceId}`,
      name: serviceId,
      description: service.description,
      domain: domain,
      fields: Object.entries(fields).reduce((acc, [key, field]) => {
        acc[key] = {
          name: key,
          description: field.description,
          required: field.required || false,
          type: field.selector ? Object.keys(field.selector)[0] : undefined,
          default: field.example,
        };
        return acc;
      }, {} as Record<string, {
        name: string;
        description?: string;
        required: boolean;
        type?: string;
        default?: unknown;
      }>),
    };
  }

  /**
   * Transform nested service structure from Home Assistant API
   * @param services The nested services object from Home Assistant API
   * @returns Array of simplified services
   */
  transformNestedServices(
    services: Record<string, Record<string, HassService>>,
  ): transforms.SimplifiedService[] {
    const flatServices: HassService[] = [];

    for (const [domain, domainServices] of Object.entries(services)) {
      for (const [serviceId, service] of Object.entries(domainServices)) {
        flatServices.push({
          ...service,
          domain,
          service: serviceId,
        });
      }
    }

    return this.transformAll(flatServices).filter(Boolean) as transforms.SimplifiedService[];
  }

  /**
   * Create a simpler view of all services
   */
  createServiceSummary(services: HassService[]): transforms.SimplifiedService[] {
    return this.transformAll(services).filter(Boolean) as transforms.SimplifiedService[];
  }

  /**
   * Group services by domain
   */
  groupByDomain(services: HassService[]): Record<string, transforms.SimplifiedService[]> {
    const result: Record<string, transforms.SimplifiedService[]> = {};

    for (const service of services) {
      const transformed = this.transform(service);
      if (!transformed) continue;

      const { domain } = transformed;

      if (!result[domain]) {
        result[domain] = [];
      }

      result[domain].push(transformed);
    }

    return result;
  }
}

// Create and export singleton instances of transformers
export const entityTransformer = new EntityTransformer();
export const serviceTransformer = new ServiceTransformer();

export function simplifyEntity(entity: Record<string, unknown>): transforms.SimplifiedEntity {
  const [domain] = (entity.entity_id as string).split('.');
  return {
    id: entity.entity_id as string,
    name: entity.name as string,
    state: entity.state as string,
    type: domain,
    updateTime: (entity.last_updated || entity.last_changed) as string,
    mainAttributes: entity.attributes as Record<string, unknown>,
  };
}
