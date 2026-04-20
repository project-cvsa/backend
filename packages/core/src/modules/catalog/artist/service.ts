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

export class ArtistService implements IServiceWithGetDetails<ArtistDetailsResponseDto> {
	constructor(private readonly repository: IArtistRepository) {}

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
			return await this.repository.create(input);
		});
	}

	async update(id: ArtistId, input: UpdateArtistRequestDto): Promise<ArtistResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db update artist", async () => {
			return await this.repository.update(id, input);
		});
	}

	async delete(id: ArtistId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.artist.notfound", "NOT_FOUND", 404);
		}
		await traceTask("db delete artist", async () => {
			return await this.repository.softDelete(id);
		});
	}
}
