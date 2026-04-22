import type { OutboxService } from "@cvsa/core/internal";
import { AppError, type IServiceWithGetDetails } from "@cvsa/core/internal";
import type {
	ArtistDetailsResponseDto,
	ArtistId,
	CreateArtistRequestDto,
	UpdateArtistRequestDto,
	ArtistResponseDto,
} from "./dto";
import type { IArtistRepository } from "./repository.interface";
import { traceTask } from "@cvsa/observability";
import { prisma } from "@cvsa/db";

export class ArtistService implements IServiceWithGetDetails<ArtistDetailsResponseDto> {
	constructor(
		private readonly repository: IArtistRepository,
		private readonly outbox: OutboxService
	) { }

	async getDetails(id: ArtistId) {
		return traceTask("db findOne artist", async () => {
			const result = await this.repository.getDetailsById(id);
			if (result === null) {
				throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
			}
			return result;
		});
	}

	async create(input: CreateArtistRequestDto): Promise<ArtistResponseDto> {
		return traceTask("db create artist", async () => {
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.create(input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "artist",
						aggregateId: result.id,
						eventType: "artist.created",
					},
					tx
				);
				return result;
			});
		});
	}

	async update(id: ArtistId, input: UpdateArtistRequestDto): Promise<ArtistResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db update artist", async () => {
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.update(id, input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "artist",
						aggregateId: id,
						eventType: "artist.updated",
					},
					tx
				);
				return result;
			});
		});
	}

	async delete(id: ArtistId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db delete artist", async () => {
			await prisma.$transaction(async (tx) => {
				await this.repository.softDelete(id, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "artist",
						aggregateId: id,
						eventType: "artist.deleted",
					},
					tx
				);
			});
		});
	}
}
