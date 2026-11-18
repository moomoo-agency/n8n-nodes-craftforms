import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { craftFormsApiRequest } from '../CraftForms/GenericFunctions';

/** Deliveries older than this are refused, so a captured one can't be replayed later. */
const MAX_AGE_SECONDS = 300;

export class CraftFormsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CraftForms Trigger',
		name: 'craftFormsTrigger',
		icon: { light: 'file:../../icons/craftforms.svg', dark: 'file:../../icons/craftforms.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when a form is submitted or an order or booking is made or changes status',
		defaults: { name: 'CraftForms Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'craftFormsApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{
						name: 'Order Created',
						value: 'order.created',
						description: 'An order or booking was made (also bookings added by hand)',
					},
					{
						name: 'Order Status Changed',
						value: 'order.status_changed',
						description: 'An order or booking was confirmed, paid, cancelled or refunded',
					},
					{
						name: 'Submission Created',
						value: 'submission.created',
						description: 'A form was submitted',
					},
				],
				default: ['submission.created'],
			},
			{
				displayName:
					'CraftForms sends events only to a public https address. A key limited to some forms only hears about those forms.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.webhookId) return false;
				try {
					const hook = await craftFormsApiRequest.call(this, 'GET', `/webhooks/${data.webhookId as number}`);
					const url = this.getNodeWebhookUrl('default');
					const wanted = [...(this.getNodeParameter('events') as string[])].sort().join(',');
					const has = [...((hook.events as string[]) ?? [])].sort().join(',');
					if (hook.url === url && has === wanted && hook.status === 'active') return true;
					// Different address or events (the workflow changed): replace it.
					await craftFormsApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId as number}`);
				} catch (error) {
					// Gone on the site (deleted, key revoked): create a new one.
					this.logger.debug(`CraftForms webhook ${String(data.webhookId)} not found, creating a new one`, {
						error: (error as Error).message,
					});
				}
				delete data.webhookId;
				delete data.webhookSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				const hook = await craftFormsApiRequest.call(this, 'POST', '/webhooks', {
					url: this.getNodeWebhookUrl('default'),
					events: this.getNodeParameter('events') as string[],
					description: `n8n: ${this.getWorkflow().name ?? 'workflow'}`,
				});
				if (!hook.id || !hook.secret) return false;
				data.webhookId = hook.id;
				// Shown once by the site; kept here to check each delivery's signature.
				data.webhookSecret = hook.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.webhookId) {
					try {
						await craftFormsApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId as number}`);
					} catch (error) {
						this.logger.warn(`CraftForms webhook ${String(data.webhookId)} could not be removed`, {
							error: (error as Error).message,
						});
						return false;
					}
				}
				delete data.webhookId;
				delete data.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const data = this.getWorkflowStaticData('node');
		const secret = data.webhookSecret as string | undefined;
		const header = String(req.headers['x-craftforms-signature'] ?? '');
		const raw = (req as unknown as { rawBody?: Buffer }).rawBody;

		if (!secret || !raw || !verifySignature(header, raw.toString('utf8'), secret)) {
			const res = this.getResponseObject();
			res.status(401).json({ error: 'Invalid signature' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData() as IDataObject;
		// The site's connection test: answer it, start nothing.
		if (body.type === 'ping') {
			return { webhookResponse: { ok: true }, workflowData: [] };
		}
		return { workflowData: [this.helpers.returnJsonArray(body)] };
	}
}

/** `t={unix},v1={hex}` where hex = HMAC-SHA256(secret, "{t}.{body}"), and t is recent. */
export function verifySignature(header: string, body: string, secret: string, now = Date.now()): boolean {
	const parts = Object.fromEntries(
		header.split(',').map((part) => {
			const at = part.indexOf('=');
			return [part.slice(0, at).trim(), part.slice(at + 1).trim()];
		}),
	) as Record<string, string>;
	const t = Number(parts.t);
	if (!parts.v1 || !Number.isFinite(t) || Math.abs(now / 1000 - t) > MAX_AGE_SECONDS) return false;
	const expected = createHmac('sha256', secret).update(`${parts.t}.${body}`).digest('hex');
	const a = Buffer.from(expected, 'hex');
	const b = Buffer.from(parts.v1, 'hex');
	return a.length === b.length && timingSafeEqual(a, b);
}
