import type { Condition } from "./tagger.types";

export interface MetafieldDefinition {
  namespace: string;
  key: string;
  valueType: 'single_line_text_field' | 'number_integer' | 'number_decimal' | 'json';
  value: string;
}

export interface MetafieldRule {
  _id?: string;
  id?: string; // For library rules
  name: string;
  resourceType: 'products' | 'customers';
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  definition: MetafieldDefinition;
  isEnabled: boolean;
  shop?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MetafieldFormData {
  _id?: string;
  name: string;
  resourceType: 'products' | 'customers';
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  definition: MetafieldDefinition;
  isEnabled: boolean;
}

export interface MetafieldFormErrors {
  name?: string;
  namespace?: string;
  key?: string;
  value?: string;
}
