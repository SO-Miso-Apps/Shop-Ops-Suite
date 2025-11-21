export interface Condition {
  field: string;
  operator: string;
  value: string;
}

export interface TaggingRule {
  _id?: string;
  name: string;
  resourceType: 'orders' | 'customers';
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  tags: string[];
  isEnabled: boolean;
  shop?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaggerFormData {
  _id?: string;
  name: string;
  resourceType: 'orders' | 'customers';
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  tags: string[];
  isEnabled: boolean;
}

export interface TaggerFormErrors {
  name?: string;
  resourceType?: string;
  conditions?: string;
  tags?: string;
}
