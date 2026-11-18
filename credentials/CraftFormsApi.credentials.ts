import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CraftFormsApi implements ICredentialType {
	name = 'craftFormsApi';

	displayName = 'CraftForms API';

	icon: Icon = { light: 'file:../icons/craftforms.svg', dark: 'file:../icons/craftforms.dark.svg' };

	documentationUrl = 'https://kb.craftformswp.com/documentation/for-developers/data-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'siteUrl',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
			required: true,
			description: 'The address of the WordPress site that runs CraftForms PRO',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'cfk_…',
			required: true,
			description:
				'Create one in WordPress: CraftForms → Settings → API Keys. Give it the scopes this workflow needs.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.siteUrl.replace(/\\/+$/, "")}}/wp-json/craftforms/data/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
