import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { jobDescription } from './resources/job';

export class WebhookScheduler implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook Scheduler',
		name: 'webhookScheduler',
		icon: { light: 'file:webhookscheduler.svg', dark: 'file:webhookscheduler.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Client for the hosted Webhook Scheduler API: schedule an HTTP request for a future date, then get, list or cancel it, with retries and delivery logs',
		defaults: {
			name: 'Webhook Scheduler',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'webhookSchedulerApi',
				required: true,
			},
		],
		requestDefaults: {
			// Fixed host: the API key must never be sent anywhere else.
			baseURL: 'https://webhookscheduler.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'job',
			},
			...jobDescription,
		],
	};
}
