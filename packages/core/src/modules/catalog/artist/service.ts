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
import type { ArtistSearchService } from "@cvsa/core/internal";
import { appLogger } from "@cvsa/logger";

export class ArtistService implements IServiceWithGetDetails<ArtistDetailsResponseDto> {
	constructor(
		private readonly repository: IArtistRepository,
		private readonly search: ArtistSearchService
	) { }
	
	private async _sync(id: number) {
		await traceTask("sync search index", async () => {
			this.search.sync(id).catch((e) => {
				appLogger.warn(Bun.inspect(e));
			});
		});
	}

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
		const result = await traceTask("db create song", async () => {
			return await this.repository.create(input);
		});
		await this._sync(result.id);
		return result;
	}

	async update(id: ArtistId, input: UpdateArtistRequestDto): Promise<ArtistResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		const result = await traceTask("db update artist", async () => {
			return await this.repository.update(id, input);
		});
		await this._sync(result.id);
		return result;
	}

	async delete(id: ArtistId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		await traceTask("db delete artist", async () => {
			return await this.repository.softDelete(id);
		});
		await this._sync(id);
	}
}
