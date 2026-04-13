import type { PrismaClient } from "@cvsa/db";
import type {
	CreateEngineRequestDto,
	EngineId,
	UpdateEngineRequestDto,
	EngineDetailsResponseDto,
} from "./dto";
import type { IEngineRepository } from "./repository.interface";
import { transformPrismaResult, type TxClient } from "@cvsa/db";

export class EngineRepository implements IEngineRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: EngineId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		return transformPrismaResult(
			await client.svsEngine.findFirst({
				where: { id, deletedAt: null },
				omit: { deletedAt: true },
			})
		);
	}

	async getDetailsById(id: EngineId, tx?: TxClient): Promise<EngineDetailsResponseDto | null> {
		const client = tx ?? this.prisma;
		return transformPrismaResult(
			await client.svsEngine.findFirst({
				where: { id, deletedAt: null },
				omit: { deletedAt: true },
			})
		);
	}

	async create(input: CreateEngineRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;

		return transformPrismaResult(
			await client.svsEngine.create({
				data: input,
				omit: { deletedAt: true },
			})
		);
	}

	async update(id: EngineId, input: UpdateEngineRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;

		return transformPrismaResult(
			await client.svsEngine.update({
				where: { id },
				data: input,
				omit: { deletedAt: true },
			})
		);
	}

	async softDelete(id: EngineId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		await client.svsEngine.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
	}
}
