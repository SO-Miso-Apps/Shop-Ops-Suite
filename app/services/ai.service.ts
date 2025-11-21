import OpenAI from "openai";

export class AIService {
  private static client = new OpenAI({
    apiKey: process.env.ZAI_API_KEY || "dummy-key", // Ensure key is present or mocked
    baseURL: "https://api.z.ai/api/coding/paas/v4/",
  });

  public static async generateRuleFromPrompt(prompt: string, resourceType: string): Promise<any> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "GLM-4.5", // Or appropriate z.ai model
        messages: [
          {
            role: "system",
            content: `You are an expert Shopify automation assistant. 
                        Convert the user's natural language request into a JSON object representing a tagging rule.
                        
                        The JSON schema is:
                        {
                            "name": "string (suggest a short descriptive name)",
                            "resourceType": "string (orders or customers)",
                            "conditionLogic": "AND" | "OR",
                            "conditions": [
                                {
                                    "field": "string (see allowed fields below)",
                                    "operator": "string (see allowed operators below)",
                                    "value": "string"
                                }
                            ],
                            "tags": ["string", "string"]
                        }

                        Allowed Fields for ${resourceType}:
                        ${resourceType === 'orders'
                ? `- total_price, subtotal_price, gateway, financial_status, currency, total_weight, shipping_lines[0].title, shipping_address.city, shipping_address.country_code, shipping_address.province_code, shipping_address.zip, source_name, tags, discount_codes[0].code, landing_site, referring_site, line_items.sku, line_items.vendor, line_items.name, line_items.quantity`
                : `- total_spent, orders_count, state, verified_email, accepts_marketing, tags, default_address.country_code, email`}

                        Allowed Operators:
                        - equals, not_equals, contains, starts_with, ends_with, greater_than, less_than, in, not_in, is_empty, is_not_empty

                        IMPORTANT: Return ONLY the JSON object. No markdown formatting.
                        `
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

      return JSON.parse(cleanContent);
    } catch (error) {
      console.error("Error generating rule from AI:", error);
      throw new Error("Failed to generate rule from AI");
    }
  }
  public static async generateMetafieldRuleFromPrompt(prompt: string, resourceType: string): Promise<any> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "GLM-4.5",
        messages: [
          {
            role: "system",
            content: `You are an expert Shopify automation assistant. 
                        Convert the user's natural language request into a JSON object representing a metafield rule.
                        
                        The JSON schema is:
                        {
                            "name": "string (suggest a short descriptive name)",
                            "resourceType": "string (products or customers)",
                            "conditionLogic": "AND" | "OR",
                            "conditions": [
                                {
                                    "field": "string (see allowed fields below)",
                                    "operator": "string (see allowed operators below)",
                                    "value": "string"
                                }
                            ],
                            "definition": {
                                "namespace": "string (suggest a namespace, e.g. custom, product_info)",
                                "key": "string (suggest a key, e.g. material, size)",
                                "value": "string (the value to set for the metafield)",
                                "valueType": "string (single_line_text_field, number_integer, number_decimal, json)"
                            }
                        }

                        Allowed Fields for ${resourceType}:
                        ${resourceType === 'products'
                ? `- title, product_type, vendor, tags, variants[0].price, variants[0].inventory_quantity`
                : `- total_spent, orders_count, tags, default_address.country_code, email`}

                        Allowed Operators:
                        - equals, not_equals, contains, starts_with, ends_with, greater_than, less_than

                        IMPORTANT: Return ONLY the JSON object. No markdown formatting.
                        `
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

      return JSON.parse(cleanContent);
    } catch (error) {
      console.error("Error generating metafield rule from AI:", error);
      throw new Error("Failed to generate metafield rule from AI");
    }
  }
}
