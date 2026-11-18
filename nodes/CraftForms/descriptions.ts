import type { INodeProperties } from 'n8n-workflow';

const show = (resource: string, operation: string[]) => ({ show: { resource: [resource], operation } });

/** "Return All" + "Limit", the n8n convention for Get Many. */
const paging = (resource: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: show(resource, ['getAll']),
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
	},
];

const idField = (resource: string, operations: string[], displayName: string, description: string): INodeProperties => ({
	displayName,
	name: 'id',
	type: 'number',
	required: true,
	default: 0,
	displayOptions: show(resource, operations),
	description,
});

const formPicker = (resource: string, operations: string[], required: boolean): INodeProperties => ({
	displayName: 'Form Name or ID',
	name: 'formId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getForms' },
	required,
	default: '',
	displayOptions: show(resource, operations),
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
});

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Catalog Item', value: 'catalogItem' },
		{ name: 'Form', value: 'form' },
		{ name: 'Order', value: 'order' },
		{ name: 'Person', value: 'person' },
		{ name: 'Submission', value: 'submission' },
	],
	default: 'submission',
};

// ── Form ─────────────────────────────────────────────────────────────────────

export const formProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['form'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a form and its fields', action: 'Get a form' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many forms', action: 'Get many forms' },
		],
		default: 'get',
	},
	formPicker('form', ['get'], true),
	...paging('form'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('form', ['getAll']),
		options: [{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Words in the form title' }],
	},
];

// ── Submission ───────────────────────────────────────────────────────────────

export const submissionProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['submission'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Submit a form, as a visitor would: validation, actions and emails run',
				action: 'Create a submission',
			},
			{ name: 'Get', value: 'get', description: 'Get a submission', action: 'Get a submission' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many submissions', action: 'Get many submissions' },
		],
		default: 'getAll',
	},
	formPicker('submission', ['create'], true),
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('submission', ['create']),
		description: "The form's answers, by field name (see Form → Get for the names)",
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Field name, e.g. email' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('submission', ['create']),
		options: [
			{
				displayName: 'Catalog Item ID',
				name: 'itemId',
				type: 'number',
				default: 0,
				description: 'For a booking or product form: the catalog item this submission is for',
			},
			{
				displayName: 'Fields (JSON)',
				name: 'fieldsJson',
				type: 'json',
				default: '{}',
				description: 'Answers as a JSON object, merged over the Fields above. Useful for lists (checkboxes).',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Sending the same key again within 24 hours returns the first result instead of a second submission',
			},
			{
				displayName: 'Language',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'de_DE',
				description: 'For translated forms: which language the messages and emails use',
			},
		],
	},
	idField('submission', ['get'], 'Submission ID', 'The ID of the submission'),
	...paging('submission'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('submission', ['getAll']),
		options: [
			{ displayName: 'Channel', name: 'channel', type: 'string', default: '', description: 'Where it came from, e.g. google, email' },
			{ displayName: 'Created Since', name: 'createdSince', type: 'dateTime', default: '' },
			{ displayName: 'Form ID', name: 'formId', type: 'number', default: 0 },
			{ displayName: 'Oldest First', name: 'oldestFirst', type: 'boolean', default: false, description: 'Whether to list oldest first (for catching up since a date)' },
			{ displayName: 'Person ID', name: 'personId', type: 'number', default: 0 },
			{ displayName: 'Status', name: 'status', type: 'string', default: '' },
		],
	},
];

// ── Order ────────────────────────────────────────────────────────────────────

export const orderProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['order'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get an order or booking', action: 'Get an order' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many orders and bookings', action: 'Get many orders' },
			{ name: 'Update Status', value: 'updateStatus', description: 'Confirm, mark paid or cancel', action: 'Update the status of an order' },
		],
		default: 'getAll',
	},
	idField('order', ['get', 'updateStatus'], 'Order ID', 'The ID of the order or booking'),
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		displayOptions: show('order', ['updateStatus']),
		options: [
			{ name: 'Cancelled', value: 'cancelled' },
			{ name: 'Confirmed', value: 'confirmed' },
			{ name: 'Paid', value: 'paid' },
			{ name: 'Pending', value: 'pending' },
		],
		default: 'confirmed',
		description: 'A cancelled or refunded order can no longer change. Refunds are made in WordPress.',
	},
	...paging('order'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('order', ['getAll']),
		options: [
			{ displayName: 'Active From', name: 'activeFrom', type: 'string', default: '', placeholder: 'YYYY-MM-DD', description: 'Bookings that touch this day or later (who is here)' },
			{ displayName: 'Active To', name: 'activeTo', type: 'string', default: '', placeholder: 'YYYY-MM-DD' },
			{ displayName: 'Catalog Item ID', name: 'itemId', type: 'number', default: 0 },
			{ displayName: 'Created Since', name: 'createdSince', type: 'dateTime', default: '' },
			{ displayName: 'Form ID', name: 'formId', type: 'number', default: 0 },
			{ displayName: 'Oldest First', name: 'oldestFirst', type: 'boolean', default: false, description: 'Whether to list oldest first (for catching up since a date)' },
			{ displayName: 'Person ID', name: 'personId', type: 'number', default: 0 },
			{ displayName: 'Starts From', name: 'startFrom', type: 'string', default: '', placeholder: 'YYYY-MM-DD', description: 'Bookings starting on this day or later (arrivals)' },
			{ displayName: 'Starts To', name: 'startTo', type: 'string', default: '', placeholder: 'YYYY-MM-DD' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '' },
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Booking', value: 'booking' },
					{ name: 'Product', value: 'product' },
				],
				default: '',
			},
			{ displayName: 'Updated Since', name: 'updatedSince', type: 'dateTime', default: '' },
		],
	},
];

// ── Catalog item ─────────────────────────────────────────────────────────────

export const catalogItemProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['catalogItem'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a room, rental, service or product', action: 'Get a catalog item' },
			{ name: 'Get Availability', value: 'getAvailability', description: 'Free dates and times between two dates', action: 'Get availability of a catalog item' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many catalog items', action: 'Get many catalog items' },
			{ name: 'Update', value: 'update', description: 'Change the price or the stock', action: 'Update a catalog item' },
		],
		default: 'getAll',
	},
	idField('catalogItem', ['get', 'getAvailability', 'update'], 'Catalog Item ID', 'The ID of the catalog item'),
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'YYYY-MM-DD',
		displayOptions: show('catalogItem', ['getAvailability']),
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'YYYY-MM-DD',
		displayOptions: show('catalogItem', ['getAvailability']),
		description: 'At most 366 days after From (62 for items booked by time)',
	},
	{
		displayName: 'Guests',
		name: 'guests',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1,
		displayOptions: show('catalogItem', ['getAvailability']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('catalogItem', ['update']),
		options: [
			{ displayName: 'Base Price', name: 'basePrice', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
			{ displayName: 'Price', name: 'price', type: 'number', default: 0, description: 'Replaces a fixed price. An item priced by a formula can\'t be changed here.' },
			{ displayName: 'Stock', name: 'stock', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: 'For products' },
		],
	},
	...paging('catalogItem'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('catalogItem', ['getAll']),
		options: [
			{ displayName: 'Form ID', name: 'formId', type: 'number', default: 0 },
			{ displayName: 'Search', name: 'search', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: 'active' },
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Booking', value: 'booking' },
					{ name: 'Product', value: 'product' },
				],
				default: '',
			},
		],
	},
];

// ── Person ───────────────────────────────────────────────────────────────────

export const personProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['person'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a person and their counts', action: 'Get a person' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many people', action: 'Get many people' },
		],
		default: 'getAll',
	},
	idField('person', ['get'], 'Person ID', 'The ID of the person'),
	...paging('person'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('person', ['getAll']),
		options: [
			{ displayName: 'Created Since', name: 'createdSince', type: 'dateTime', default: '' },
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Name, email or phone' },
		],
	},
];
