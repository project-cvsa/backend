import { AppError } from "../../../error/AppError";
import type { IServiceWithGetDetails } from "../../../types/service";
import type {
	SingerDetailsResponseDto,
	SingerId,
	CreateSingerRequestDto,
	UpdateSingerRequestDto,
	SingerResponseDto,
} from "./dto";
import type { ISingerRepository } from "./repository.interface";
import { traceTask } from "@cvsa/observability";

export class SingerService implements IServiceWithGetDetails<SingerDetailsResponseDto> {
	constructor(private readonly repository: ISingerRepository) {}

	async getDetails(id: SingerId) {
		return traceTask("db findOne singer", async () => {
			const result = await this.repository.getDetailsById(id);
			if (result === null) {
				throw new AppError("error.singer.notfound", "NOT_FOUND", 404);
			}
			return result;
		});
	}

	async create(input: CreateSingerRequestDto): Promise<SingerResponseDto> {
		return traceTask("db create singer", async () => {
			return await this.repository.create(input);
		});
	}

	async update(id: SingerId, input: UpdateSingerRequestDto): Promise<SingerResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.singer.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db update singer", async () => {
			return await this.repository.update(id, input);
		});
	}

	async delete(id: SingerId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.singer.notfound", "NOT_FOUND", 404);
		}
		await traceTask("db delete singer", async () => {
			return await this.repository.softDelete(id);
		});
	}
}
