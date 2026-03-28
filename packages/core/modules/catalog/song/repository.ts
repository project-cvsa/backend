import type { Prisma, PrismaClient } from "@cvsa/db";
import type {
	CreateSongRequestDto,
	ListSongsQueryDto,
	SongId,
	UpdateSongRequestDto,
	SongDetailsResponseDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import type { TxClient } from "@cvsa/core/common";

export class SongRepository implements ISongRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: SongId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		return client.song.findFirst({ where: { id, deletedAt: null } });
	}

	async getDetailsById(id: SongId, tx?: TxClient): Promise<SongDetailsResponseDto | null> {
		const client = tx ?? this.prisma;
		const data = await client.song.findFirst({
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

	async list(query: ListSongsQueryDto = {}, tx?: TxClient) {
		const client = tx ?? this.prisma;
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
			client.song.findMany({
				where,
				skip,
				take,
				orderBy: { createdAt: "desc" },
			}),
			client.song.count({ where }),
		]);

		return { songs, total };
	}

	async create(input: CreateSongRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;
		const { performances, creations, ...songData } = input;

		return client.song.create({
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

	async update(id: SongId, input: UpdateSongRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;
		const songData = input;

		const data: Prisma.SongUpdateInput = {
			...(songData.type !== undefined ? { type: songData.type } : {}),
			...(songData.name !== undefined ? { name: songData.name } : {}),
			...(songData.duration !== undefined ? { duration: songData.duration } : {}),
			...(songData.description !== undefined ? { description: songData.description } : {}),
			...(songData.coverUrl !== undefined ? { coverUrl: songData.coverUrl } : {}),
			...(songData.publishedAt !== undefined ? { publishedAt: songData.publishedAt } : {}),
		};

		return client.song.update({
			where: { id },
			data,
		});
	}

	async softDelete(id: SongId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		await client.song.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
