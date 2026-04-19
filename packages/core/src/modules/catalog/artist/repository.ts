import type { PrismaClient } from "@cvsa/db";
import type {
	CreateArtistRequestDto,
	ArtistId,
	UpdateArtistRequestDto,
	ArtistDetailsResponseDto,
} from "./dto";
import type { IArtistRepository } from "./repository.interface";
import { transformPrismaResult, type TxClient } from "@cvsa/db";

export class ArtistRepository implements IArtistRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: ArtistId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		return transformPrismaResult(
			await client.artist.findFirst({
				where: { id, deletedAt: null },
				omit: { deletedAt: true },
			})
		);
	}

	async getDetailsById(id: ArtistId, tx?: TxClient): Promise<ArtistDetailsResponseDto | null> {
		const client = tx ?? this.prisma;
		return transformPrismaResult(
			await client.artist.findFirst({
				where: { id, deletedAt: null },
				omit: { deletedAt: true },
			})
		);
	}

	async create(input: CreateArtistRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;

		return transformPrismaResult(
			await client.artist.create({
				data: input,
				omit: { deletedAt: true },
			})
		);
	}

	async update(id: ArtistId, input: UpdateArtistRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;

		return transformPrismaResult(
			await client.artist.update({
				where: { id },
				data: input,
				omit: { deletedAt: true },
			})
		);
	}

	async softDelete(id: ArtistId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		await client.artist.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
	}
}
