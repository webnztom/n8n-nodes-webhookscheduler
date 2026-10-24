import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobSchedule = {
	operation: ['schedule'],
	resource: ['job'],
};

export const jobScheduleDescription: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://hooks.example.com/reminders',
		displayOptions: {
			show: showOnlyForJobSchedule,
		},
		description: 'Public HTTPS URL to call when the job fires. Private networks are rejected.',
		routing: {
			send: {
				type: 'body',
				property: 'url',
			},
		},
	},
	{
		displayName: 'Run At',
		name: 'runAt',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForJobSchedule,
		},
		description:
			'When to send the call, as an ISO 8601 date-time (for example 2026-11-02T09:00:00Z). Must be in the future. Free plan: up to 7 days ahead; paid plans: up to 365 days.',
		routing: {
			send: {
				type: 'body',
				property: 'runAt',
				value: '={{ new Date($value).toISOString() }}',
			},
		},
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
		default: 'POST',
		displayOptions: {
			show: showOnlyForJobSchedule,
		},
		description: 'HTTP method used for the delivery',
		routing: {
			send: {
				type: 'body',
				property: 'method',
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: showOnlyForJobSchedule,
		},
		description: 'JSON body sent to the destination (up to 100 KB)',
		routing: {
			send: {
				type: 'body',
				property: 'body',
				value: '={{ typeof $value === "string" ? JSON.parse($value || "{}") : $value }}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForJobSchedule,
		},
		options: [
			{
				displayName: 'Criticality',
				name: 'criticality',
				type: 'options',
				options: [
					{ name: 'Critical', value: 'CRITICAL' },
					{ name: 'Important', value: 'IMPORTANT' },
					{ name: 'Standard', value: 'STANDARD' },
				],
				default: 'STANDARD',
				description: 'Business impact used by delivery-alert thresholds',
				routing: {
					send: {
						type: 'body',
						property: 'criticality',
					},
				},
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Header',
				description:
					'Custom headers sent with the delivery (up to 32). Removed before delivery: Authorization, Proxy-*, Cookie, Set-Cookie, Content-Type, Content-Length, User-Agent, Host, Forwarded, X-Forwarded-For/Host/Proto, X-Real-IP, Via, Webhook-Signature, X-Webhook-Signature and hop-by-hop headers. To authenticate the call, send a secret in a custom header such as X-Api-Key, or verify the Webhook-Signature header on your receiver.',
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'headers',
						value:
							'={{ Object.fromEntries((($value && $value.header) || []).filter(h => h.name).map(h => [h.name, h.value])) }}',
					},
				},
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'8 to 80 characters. Repeat calls with the same key return the same job instead of creating a duplicate.',
				routing: {
					send: {
						type: 'body',
						property: 'idempotencyKey',
					},
				},
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				placeholder: 'trial-reminder:cus_4821',
				description:
					'Your own business identifier, up to 120 characters: letters, digits and : . _ / - only (no spaces or @). Use it later with Cancel by Reference when the customer acts.',
				routing: {
					send: {
						type: 'body',
						property: 'reference',
					},
				},
			},
		],
	},
];
