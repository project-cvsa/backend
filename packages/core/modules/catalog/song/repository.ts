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

		const [songs, total] = await Promise.all([
			this.prisma.song.findMany({
				where,
				skip,
				take,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.song.count({ where }),
		]);

		return { songs, total };
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

	async createWithRelations(input: CreateSongDto) {
		const { performances, creations, ...songData } = input;

		return this.prisma.song.create({
			data: {
				type: songData.type ?? null,
				name: songData.name ?? null,
				duration: songData.duration ?? null,
				description: songData.description ?? null,
				coverUrl: songData.coverUrl ?? null,
				publishedAt: songData.publishedAt ?? null,
				performances: performances
					? {
							create: performances.map((p) => ({
								singerId: p.singerId,
								voicebankId: p.voicebankId ?? undefined,
								svsEngineId: p.svsEngineId ?? undefined,
								svsEngineVersionId: p.svsEngineVersionId ?? undefined,
							})),
						}
					: undefined,
				creations: creations
					? {
							create: creations.map((c) => ({
								artistId: c.artistId,
								roleId: c.roleId,
								artistRoleId: c.roleId,
							})),
						}
					: undefined,
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

	async updateWithRelations(id: SongId, input: UpdateSongDto) {
		const { performances, creations, ...songData } = input;

		const data: Prisma.SongUpdateInput = {
			...(songData.type !== undefined ? { type: songData.type } : {}),
			...(songData.name !== undefined ? { name: songData.name } : {}),
			...(songData.duration !== undefined ? { duration: songData.duration } : {}),
			...(songData.description !== undefined ? { description: songData.description } : {}),
			...(songData.coverUrl !== undefined ? { coverUrl: songData.coverUrl } : {}),
			...(songData.publishedAt !== undefined ? { publishedAt: songData.publishedAt } : {}),
			...(songData.deletedAt !== undefined ? { deletedAt: songData.deletedAt } : {}),
		};

		if (performances !== undefined) {
			data.performances = {
				deleteMany: {},
				create: performances.map((p) => ({
					singerId: p.singerId,
					voicebankId: p.voicebankId ?? undefined,
					svsEngineId: p.svsEngineId ?? undefined,
					svsEngineVersionId: p.svsEngineVersionId ?? undefined,
				})),
			};
		}

		if (creations !== undefined) {
			data.creations = {
				deleteMany: {},
				create: creations.map((c) => ({
					artistId: c.artistId,
					roleId: c.roleId,
					artistRoleId: c.roleId,
				})),
			};
		}

		return this.prisma.song.update({
			where: { id },
			data,
		});
	}

	async softDelete(id: SongId) {
		await this.prisma.song.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
