import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobCancel = {
	operation: ['cancel'],
	resource: ['job'],
};

export const jobCancelDescription: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForJobCancel,
		},
		description:
			'The ID of the job to cancel. Only PENDING or RETRYING jobs can be canceled; anything already delivered is left untouched.',
	},
];
