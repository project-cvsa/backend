import type { Prisma, PrismaClient } from "@cvsa/db";
import type { SongDetailsResponseDto } from "./dto";
import type { CreateSongRequestDto, ListSongsQueryDto, SongId, UpdateSongRequestDto } from "./dto";
import type { ISongRepository } from "./repository.interface";

export class SongRepository implements ISongRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: SongId) {
		return this.prisma.song.findFirst({ where: { id, deletedAt: null } });
	}

	async getDetailsById(id: SongId): Promise<SongDetailsResponseDto | null> {
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
				lyrics: true,
			},
		});
		if (!data) return null;
		const { performances, creations, lyrics, ...song } = data;
		return {
			singers: performances.map((item) => item.singer),
			artists: creations.map((item) => {
				return {
					...item.artist,
					role: item.role,
				};
			}),
			lyrics: lyrics.map((item) => {
				return {
					plainText: item.plainText,
					language: item.language,
					isTranslated: item.isTranslated,
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

	async create(input: CreateSongRequestDto) {
		const { performances, creations, ...songData } = input;

		return this.prisma.song.create({
			data: {
				type: songData.type ?? null,
				name: songData.name ?? null,
				duration: songData.duration ?? null,
				description: songData.description ?? null,
				coverUrl: songData.coverUrl ?? null,
				publishedAt: songData.publishedAt ?? null,
				performances: performances && {
					create: performances,
				},
				creations: creations && {
					create: creations.map((c) => ({
						artistId: c.artistId,
						artistRoleId: c.roleId,
					})),
				},
			},
		});
	}

	async update(id: SongId, input: UpdateSongRequestDto) {
		const songData = input;

		const data: Prisma.SongUpdateInput = {
			...(songData.type !== undefined ? { type: songData.type } : {}),
			...(songData.name !== undefined ? { name: songData.name } : {}),
			...(songData.duration !== undefined ? { duration: songData.duration } : {}),
			...(songData.description !== undefined ? { description: songData.description } : {}),
			...(songData.coverUrl !== undefined ? { coverUrl: songData.coverUrl } : {}),
			...(songData.publishedAt !== undefined ? { publishedAt: songData.publishedAt } : {}),
		};

		return this.prisma.song.update({
			where: { id },
			data,
		});
	}

	async softDelete(id: SongId) {
		await this.prisma.song.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
