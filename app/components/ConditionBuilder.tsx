import {
  Badge,
  Button,
  FormLayout,
  InlineStack,
  RadioButton,
  Select,
  Text,
  TextField
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface ConditionBuilderProps {
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  resourceType: string;
  onChange: (newConditions: Condition[], newLogic: 'AND' | 'OR') => void;
}

export function ConditionBuilder({ conditions, conditionLogic, resourceType, onChange }: ConditionBuilderProps) {

  const getFieldOptions = (type: string) => {
    switch (type) {
      case "orders":
        return [
          { label: "Total Price", value: "total_price" },
          { label: "Subtotal Price", value: "subtotal_price" },
          { label: "Gateway / Payment Method", value: "gateway" },
          { label: "Financial Status", value: "financial_status" },
          { label: "Currency", value: "currency" },
          { label: "Total Weight", value: "total_weight" },
          { label: "Shipping Method", value: "shipping_lines[0].title" },
          { label: "Shipping City", value: "shipping_address.city" },
          { label: "Shipping Country", value: "shipping_address.country_code" },
          { label: "Shipping Province/State", value: "shipping_address.province_code" },
          { label: "Shipping Zip", value: "shipping_address.zip" },
          { label: "Source Name", value: "source_name" },
          { label: "Tags", value: "tags" },
          { label: "Discount Code", value: "discount_codes[0].code" },
          { label: "Landing Site", value: "landing_site" },
          { label: "Referring Site", value: "referring_site" },
          { label: "Line Item SKU", value: "line_items.sku" },
          { label: "Line Item Vendor", value: "line_items.vendor" },
          { label: "Line Item Name", value: "line_items.name" },
          { label: "Line Item Quantity", value: "line_items.quantity" },
          { label: "Customer Order Count", value: "customer.orders_count" },
          { label: "Email", value: "email" },
        ];
      case "customers":
        return [
          { label: "Total Spent", value: "total_spent" },
          { label: "Orders Count", value: "orders_count" },
          { label: "Account State", value: "state" },
          { label: "Verified Email", value: "verified_email" },
          { label: "Accepts Marketing", value: "accepts_marketing" },
          { label: "Tags", value: "tags" },
          { label: "Country", value: "default_address.country_code" },
          { label: "Email", value: "email" },
          { label: "State/Province", value: "default_address.province_code" },
        ];
      case "products":
        return [
          { label: "Title", value: "title" },
          { label: "Product Type", value: "product_type" },
          { label: "Vendor", value: "vendor" },
          { label: "Tags", value: "tags" },
          { label: "Price", value: "variants[0].price" },
          { label: "Inventory Quantity", value: "variants[0].inventory_quantity" },
          { label: "Status", value: "status" },
        ];
      default:
        return [];
    }
  };

  const fieldOptions = getFieldOptions(resourceType);

  const addCondition = () => {
    const defaultField = fieldOptions.length > 0 ? fieldOptions[0].value : "id";
    const newConditions = [...conditions, { field: defaultField, operator: "equals", value: "" }];
    onChange(newConditions, conditionLogic);
  };

  const updateCondition = (index: number, key: string, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: value };
    onChange(newConditions, conditionLogic);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions, conditionLogic);
  };

  const handleLogicChange = (newLogic: 'AND' | 'OR') => {
    onChange(conditions, newLogic);
  };

  const operatorOptions = [
    { label: "Equals", value: "equals" },
    { label: "Not Equals", value: "not_equals" },
    { label: "Contains", value: "contains" },
    { label: "Starts With", value: "starts_with" },
    { label: "Ends With", value: "ends_with" },
    { label: "Greater Than", value: "greater_than" },
    { label: "Less Than", value: "less_than" },
    { label: "In (comma separated)", value: "in" },
    { label: "Not In (comma separated)", value: "not_in" },
    { label: "Is Empty", value: "is_empty" },
    { label: "Is Not Empty", value: "is_not_empty" },
  ];

  return (
    <FormLayout>
      <FormLayout.Group title="Condition Logic">
        <RadioButton
          label="All rules passes"
          helpText="The trigger will only run if every single condition is met"
          checked={conditionLogic === 'AND'}
          id="logic-and"
          name="conditionLogic"
          onChange={() => handleLogicChange('AND')}
        />
        <RadioButton
          label="Any rule passes"
          helpText="The trigger will run if any one of the conditions is true"
          checked={conditionLogic === 'OR'}
          id="logic-or"
          name="conditionLogic"
          onChange={() => handleLogicChange('OR')}
        />
      </FormLayout.Group>

      <Text as="h3" variant="headingSm">Conditions</Text>
      {conditions.map((condition, index) => (
        <div key={index}>
          {index > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
              <div style={{ flex: 1, borderBottom: '1px solid var(--p-color-border)' }}></div>
              <div style={{ margin: '0 12px' }}>
                <Badge tone={conditionLogic === 'OR' ? undefined : 'info'}>
                  {conditionLogic === 'OR' ? 'OR' : 'AND'}
                </Badge>
              </div>
              <div style={{ flex: 1, borderBottom: '1px solid var(--p-color-border)' }}></div>
            </div>
          )}
          <InlineStack gap="200" align="start">
            <div style={{ flex: 1 }}>
              <Select
                label="Field"
                labelHidden
                options={fieldOptions}
                value={condition.field}
                onChange={(val) => updateCondition(index, "field", val)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Select
                label="Operator"
                labelHidden
                options={operatorOptions}
                value={condition.operator}
                onChange={(val) => updateCondition(index, "operator", val)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Value"
                labelHidden
                value={condition.value}
                onChange={(val) => updateCondition(index, "value", val)}
                autoComplete="off"
              />
            </div>
            <Button icon={DeleteIcon} onClick={() => removeCondition(index)} tone="critical" variant="plain" />
          </InlineStack>
        </div>
      ))}
      <Button onClick={addCondition} variant="plain" icon={PlusIcon}>Add Condition</Button>
    </FormLayout>
  );
}
