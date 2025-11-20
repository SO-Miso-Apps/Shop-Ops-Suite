import { unauthenticated } from "../shopify.server";

export class BulkOperationService {
    static async runBulkQuery(shop: string, query: string) {
        const { admin } = await unauthenticated.admin(shop);
        const response = await admin.graphql(
            `#graphql
            mutation bulkOperationRunQuery($query: String!) {
                bulkOperationRunQuery(query: $query) {
                    bulkOperation {
                        id
                        status
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
            {
                variables: { query },
            }
        );

        const data = await response.json();
        if (data.data.bulkOperationRunQuery.userErrors.length > 0) {
            throw new Error(JSON.stringify(data.data.bulkOperationRunQuery.userErrors));
        }

        return data.data.bulkOperationRunQuery.bulkOperation;
    }

    static async pollBulkOperation(shop: string, operationId: string) {
        const { admin } = await unauthenticated.admin(shop);

        const response = await admin.graphql(
            `#graphql
            query bulkOperation($id: ID!) {
                node(id: $id) {
                    ... on BulkOperation {
                        id
                        status
                        errorCode
                        createdAt
                        completedAt
                        objectCount
                        fileSize
                        url
                        partialDataUrl
                    }
                }
            }`,
            {
                variables: { id: operationId },
            }
        );

        const data = await response.json();
        return data.data.node;
    }

    static async cancelBulkOperation(shop: string, operationId: string) {
        const { admin } = await unauthenticated.admin(shop);
        const response = await admin.graphql(
            `#graphql
            mutation bulkOperationCancel($id: ID!) {
                bulkOperationCancel(id: $id) {
                    bulkOperation {
                        status
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
            {
                variables: { id: operationId },
            }
        );
        return response.json();
    }

    static async getStagedUploadUrl(shop: string) {
        const { admin } = await unauthenticated.admin(shop);
        const response = await admin.graphql(
            `#graphql
            mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                stagedUploadsCreate(input: $input) {
                    stagedTargets {
                        url
                        resourceUrl
                        parameters {
                            name
                            value
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
            {
                variables: {
                    input: [
                        {
                            resource: "BULK_MUTATION_VARIABLES",
                            filename: "bulk_op_vars",
                            mimeType: "text/jsonl",
                            httpMethod: "POST",
                        },
                    ],
                },
            }
        );
        const data = await response.json();
        if (data.data.stagedUploadsCreate.userErrors.length > 0) {
            throw new Error(JSON.stringify(data.data.stagedUploadsCreate.userErrors));
        }
        return data.data.stagedUploadsCreate.stagedTargets[0];
    }

    static async runBulkMutation(shop: string, mutation: string, uploadPath: string) {
        const { admin } = await unauthenticated.admin(shop);
        const response = await admin.graphql(
            `#graphql
            mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
                bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
                    bulkOperation {
                        id
                        status
                        url
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }`,
            {
                variables: {
                    mutation,
                    stagedUploadPath: uploadPath,
                },
            }
        );
        const data = await response.json();
        if (data.data.bulkOperationRunMutation.userErrors.length > 0) {
            throw new Error(JSON.stringify(data.data.bulkOperationRunMutation.userErrors));
        }
        return data.data.bulkOperationRunMutation.bulkOperation;
    }
}
