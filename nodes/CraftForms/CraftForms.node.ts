import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	cleanQuery,
	craftFormsApiRequest,
	craftFormsApiRequestAllItems,
	toSnake,
} from './GenericFunctions';
import {
	catalogItemProperties,
	formProperties,
	orderProperties,
	personProperties,
	resourceProperty,
	submissionProperties,
} from './descriptions';

/**
 * Programmatic style: "Return All" follows the API's cursor across requests, a submission's
 * fields are assembled from two inputs, and Idempotency-Key is a per-item header.
 */
export class CraftForms implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CraftForms',
		name: 'craftForms',
		icon: { light: 'file:../../icons/craftforms.svg', dark: 'file:../../icons/craftforms.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and create form submissions, orders, bookings and catalog items in CraftForms',
		defaults: { name: 'CraftForms' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'craftFormsApi', required: true }],
		properties: [
			resourceProperty,
			...submissionProperties,
			...orderProperties,
			...catalogItemProperties,
			...formProperties,
			...personProperties,
		],
	};

	methods = {
		loadOptions: {
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const forms = await craftFormsApiRequestAllItems.call(this, '/forms', {}, 500);
				return forms.map((form) => ({
					name: `${form.title as string} (#${form.id as number})`,
					value: form.id as number,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[] = {};

				const many = async (endpoint: string, extra: IDataObject = {}) => {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
					const filters = cleanQuery(this.getNodeParameter('filters', i, {}) as IDataObject);
					if (filters.oldestFirst) filters.order = 'asc';
					delete filters.oldestFirst;
					return craftFormsApiRequestAllItems.call(this, endpoint, { ...toSnake(filters), ...extra }, limit);
				};
				const id = () => this.getNodeParameter('id', i) as number;

				if (resource === 'form') {
					if (operation === 'get') {
						result = await craftFormsApiRequest.call(this, 'GET', `/forms/${this.getNodeParameter('formId', i) as number}`);
					} else if (operation === 'getAll') {
						result = await many('/forms');
					}
				} else if (resource === 'submission') {
					if (operation === 'create') {
						const formId = this.getNodeParameter('formId', i) as number;
						const pairs = (this.getNodeParameter('fields', i, {}) as IDataObject).field as IDataObject[] | undefined;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const fields: IDataObject = {};
						for (const pair of pairs ?? []) {
							if (pair.name) fields[pair.name as string] = pair.value;
						}
						if (options.fieldsJson) {
							const extra =
								typeof options.fieldsJson === 'string' ? JSON.parse(options.fieldsJson as string) : options.fieldsJson;
							if (extra && typeof extra === 'object' && !Array.isArray(extra)) Object.assign(fields, extra);
							else throw new NodeOperationError(this.getNode(), 'Fields (JSON) must be a JSON object', { itemIndex: i });
						}
						const body: IDataObject = { fields };
						if (options.itemId) body.item_id = options.itemId;
						if (options.locale) body.locale = options.locale;
						const headers: IDataObject = {};
						if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
						result = await craftFormsApiRequest.call(this, 'POST', `/forms/${formId}/submissions`, body, {}, headers);
					} else if (operation === 'get') {
						result = await craftFormsApiRequest.call(this, 'GET', `/submissions/${id()}`);
					} else if (operation === 'getAll') {
						result = await many('/submissions');
					}
				} else if (resource === 'order') {
					if (operation === 'get') {
						result = await craftFormsApiRequest.call(this, 'GET', `/orders/${id()}`);
					} else if (operation === 'getAll') {
						result = await many('/orders');
					} else if (operation === 'updateStatus') {
						result = await craftFormsApiRequest.call(this, 'POST', `/orders/${id()}/status`, {
							status: this.getNodeParameter('status', i) as string,
						});
					}
				} else if (resource === 'catalogItem') {
					if (operation === 'get') {
						result = await craftFormsApiRequest.call(this, 'GET', `/catalog/items/${id()}`);
					} else if (operation === 'getAll') {
						result = await many('/catalog/items');
					} else if (operation === 'getAvailability') {
						result = await craftFormsApiRequest.call(this, 'GET', `/catalog/items/${id()}/availability`, {}, {
							from: this.getNodeParameter('from', i) as string,
							to: this.getNodeParameter('to', i) as string,
							guests: this.getNodeParameter('guests', i) as number,
						});
					} else if (operation === 'update') {
						const fields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
						if (!Object.keys(fields).length) {
							throw new NodeOperationError(this.getNode(), 'Add a field to update: Price, Base Price or Stock', { itemIndex: i });
						}
						result = await craftFormsApiRequest.call(this, 'PATCH', `/catalog/items/${id()}`, toSnake(fields));
					}
				} else if (resource === 'person') {
					if (operation === 'get') {
						result = await craftFormsApiRequest.call(this, 'GET', `/people/${id()}`);
					} else if (operation === 'getAll') {
						result = await many('/people');
					}
				}

				const rows = Array.isArray(result) ? result : [result];
				returnData.push(...rows.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// The API's own message (e.g. "This form is not published") is kept as the error's message.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
