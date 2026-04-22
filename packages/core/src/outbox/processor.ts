import type { Job } from "bullmq";
import type { OutboxEntryDto } from "@cvsa/core/internal";
import { songSearchService, artistSearchService } from "@cvsa/core/internal";
import { outboxService } from "../modules/outbox/container";
import { appLogger } from "@cvsa/logger";

export async function processOutboxEntry(job: Job<OutboxEntryDto>): Promise<void> {
	const entry = job.data;

	await outboxService.processEntry(entry.id, async (aggregateType, aggregateId, eventType) => {
		appLogger.debug(
			`processing outbox entry with ID ${aggregateId}, type ${aggregateType}`,
			{
				aggregateId,
				aggregateType,
				eventType,
			}
		);
		switch (aggregateType) {
			case "song":
				await songSearchService.sync(aggregateId);
				break;
			case "artist":
				await artistSearchService.sync(aggregateId);
				break;
			default:
				appLogger.warn(`Unknown aggregate type: ${aggregateType}`);
				throw new Error(`Unknown aggregate type: ${aggregateType}`);
		}
	});
}
