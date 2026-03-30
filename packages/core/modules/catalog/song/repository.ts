import type { Prisma, PrismaClient } from "@cvsa/db";
import type {
	CreateSongRequestDto,
	SongId,
	UpdateSongRequestDto,
	SongDetailsResponseDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import { transformPrismaResult, type TxClient } from "@cvsa/core/common";

export class SongRepository implements ISongRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async getById(id: SongId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		return transformPrismaResult(
			await client.song.findFirst({ where: { id, deletedAt: null } })
		);
	}

	async getDetailsById(id: SongId, tx?: TxClient): Promise<SongDetailsResponseDto | null> {
		const client = tx ?? this.prisma;
		const data = transformPrismaResult(
			await client.song.findFirst({
				where: { id, deletedAt: null },
				include: {
					performances: {
						include: {
							singer: true,
							svsEngine: true,
							svsEngineVersion: true,
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
			})
		);
		if (!data) return null;
		const { performances, creations, lyrics, ...song } = data;
		return {
			singers: performances.map((item) => {
				const engineName = item.svsEngine?.name ?? "";
				const engineVersion = item.svsEngineVersion?.versionString ?? "";
				const engine = (() => {
					if (!engineName) return null;
					if (!engineVersion) return engineName;
					return `${engineName} ${engineVersion}`;
				})();
				return {
					...item.singer,
					engine,
				};
			}),
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

	async create(input: CreateSongRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;
		const { performances, creations, ...songData } = input;

		return transformPrismaResult(
			await client.song.create({
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
			})
		);
	}

	async update(id: SongId, input: UpdateSongRequestDto, tx?: TxClient) {
		const client = tx ?? this.prisma;

		return transformPrismaResult(
			await client.song.update({
				where: { id },
				data: input,
			})
		);
	}

	async softDelete(id: SongId, tx?: TxClient) {
		const client = tx ?? this.prisma;
		await client.song.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
