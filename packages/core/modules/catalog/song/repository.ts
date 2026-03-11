import type { Prisma, PrismaClient } from "@project-cvsa/db";
import type { SongDetailsDto } from "./dto";
import type { CreateSongDto, ListSongsQueryDto, SongId, UpdateSongDto } from "./dto";
import type { ISongRepository } from "./repository.interface";

export class SongRepository implements ISongRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: SongId) {
		return this.prisma.song.findFirst({ where: { id, deletedAt: null } });
	}

	async getDetailsById(id: SongId): Promise<SongDetailsDto | null> {
		const data = await this.prisma.song.findFirst({
			where: { id, deletedAt: null },
			include: {
				performances: {
					include: {
						singer: true,
					},
				},
				creations: {
					include: {
						role: true,
						artist: true,
					},
				},
			},
		});
		if (!data) return null;
		const { performances, creations, ...song } = data;
		return {
			singers: performances.map((item) => item.singer),
			artists: creations.map((item) => {
				return {
					...item.artist,
					role: item.role,
				};
			}),
			...song,
		};
	}

	async list(query: ListSongsQueryDto = {}) {
		const { offset: skip = 0, limit: take = 50, type, search } = query;

		const where: Prisma.SongWhereInput = {
			deletedAt: null,
			type,
		};

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
			];
		}

		return this.prisma.song.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
		});
	}

	async create(input: CreateSongDto) {
		return await this.prisma.song.create({
			data: {
				type: input.type ?? null,
				name: input.name ?? null,
				duration: input.duration ?? null,
				description: input.description ?? null,
				coverUrl: input.coverUrl ?? null,
				publishedAt: input.publishedAt ?? null,
			},
		});
	}

	async update(id: SongId, input: UpdateSongDto) {
		return this.prisma.song.update({
			where: { id },
			data: {
				...(input.type !== undefined ? { type: input.type } : {}),
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.duration !== undefined ? { duration: input.duration } : {}),
				...(input.description !== undefined ? { description: input.description } : {}),
				...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
				...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
				...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
			},
		});
	}

	async softDelete(id: SongId) {
		await this.prisma.song.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
