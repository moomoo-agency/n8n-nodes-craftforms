import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/** The site's Data API base: https://example.com/wp-json/craftforms/data/v1 */
export async function baseUrl(this: Context): Promise<string> {
	const credentials = await this.getCredentials('craftFormsApi');
	return String(credentials.siteUrl).replace(/\/+$/, '') + '/wp-json/craftforms/data/v1';
}

export async function craftFormsApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: (await baseUrl.call(this)) + endpoint,
		qs,
		headers: { Accept: 'application/json', ...headers },
		json: true,
	};
	if (method !== 'GET' && method !== 'DELETE') {
		options.body = body;
	}
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'craftFormsApi',
			options,
		)) as IDataObject;
	} catch (error) {
		// The site's own message ("Field "email" is required.") says more than n8n's generic
		// "Your request is invalid", so it leads.
		// Newer n8n versions hand the error over already wrapped, the site's message as its description.
		const failed = error as { response?: { body?: IDataObject; data?: IDataObject }; description?: unknown };
		const body = failed.response?.body ?? failed.response?.data;
		const message =
			typeof body?.message === 'string'
				? body.message
				: typeof failed.description === 'string' && failed.description !== ''
					? failed.description
					: undefined;
		throw new NodeApiError(this.getNode(), error as JsonObject, message ? { message } : {});
	}
}

/**
 * A list endpoint, following `next_cursor` until `limit` items (or all of them) are read.
 * Responses are `{ data: [...], next_cursor: string | null }`.
 */
export async function craftFormsApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	qs: IDataObject = {},
	limit = 0,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let cursor: string | null = null;
	do {
		const page: IDataObject = { ...qs, limit: 100 };
		if (cursor) page.cursor = cursor;
		const response = await craftFormsApiRequest.call(this, 'GET', endpoint, {}, page);
		items.push(...((response.data as IDataObject[]) ?? []));
		cursor = (response.next_cursor as string | null) ?? null;
	} while (cursor && (limit === 0 || items.length < limit));
	return limit > 0 ? items.slice(0, limit) : items;
}

/** Drops empty values a user left in an "Additional Fields" / "Filters" collection. */
export function cleanQuery(values: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(values)) {
		if (value === '' || value === null || value === undefined) continue;
		if (typeof value === 'number' && value === 0 && key.endsWith('Id')) continue;
		out[key] = value;
	}
	return out;
}

/** n8n property names are camelCase; the API's query names are snake_case. */
export function toSnake(values: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(values)) {
		out[key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = value;
	}
	return out;
}
