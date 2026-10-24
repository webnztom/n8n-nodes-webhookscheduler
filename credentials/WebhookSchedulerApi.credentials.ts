import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WebhookSchedulerApi implements ICredentialType {
	name = 'webhookSchedulerApi';

	displayName = 'Webhook Scheduler API';

	icon: Icon = {
		light: 'file:../nodes/WebhookScheduler/webhookscheduler.svg',
		dark: 'file:../nodes/WebhookScheduler/webhookscheduler.dark.svg',
	};

	documentationUrl = 'https://webhookscheduler.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create a key at https://webhookscheduler.com/dashboard/api-keys. Keys start with wh_live_ or wh_test_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	// The host is fixed on purpose: the API key is only ever sent to
	// webhookscheduler.com, so there is no configurable base URL.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://webhookscheduler.com',
			url: '/api/v1/jobs?limit=1',
			method: 'GET',
		},
	};
}
