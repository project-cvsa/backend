import type { PrismaClient } from "@cvsa/db";
import type {
	CreateSongRequestDto,
	SongId,
	UpdateSongRequestDto,
	SongDetailsResponseDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import { AppError, transformPrismaResult, type TxClient } from "@cvsa/core/common";

type PerformanceInput = NonNullable<CreateSongRequestDto["performances"]>[number];

export class SongRepository implements ISongRepository {
	constructor(private readonly prisma: PrismaClient) {}

	private async validatePerformances(
		performances: PerformanceInput[],
		db: TxClient
	): Promise<void> {
		for (const perf of performances) {
			// Step 1: Verify singer exists
			const singer = await db.singer.findUnique({
				where: { id: perf.singerId },
				select: { id: true },
			});
			if (!singer) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			// Step 2: Verify optional referenced IDs
			const voicebank =
				perf.voicebankId != null
					? await db.voicebank.findUnique({
							where: { id: perf.voicebankId },
							select: { singerId: true, svsEngineVersionId: true },
						})
					: null;
			if (perf.voicebankId != null && !voicebank) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			const engineVersion =
				perf.svsEngineVersionId != null
					? await db.svsEngineVersion.findUnique({
							where: { id: perf.svsEngineVersionId },
							select: { svsEngineId: true },
						})
					: null;
			if (perf.svsEngineVersionId != null && !engineVersion) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			const engine =
				perf.svsEngineId != null
					? await db.svsEngine.findUnique({
							where: { id: perf.svsEngineId },
							select: { id: true },
						})
					: null;
			if (perf.svsEngineId != null && !engine) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			// Step 3: Cross-entity consistency checks
			if (voicebank && voicebank.singerId !== perf.singerId) {
				throw new AppError(
					"Voicebank does not belong to the specified singer",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
			if (voicebank && engineVersion && voicebank.svsEngineVersionId !== perf.svsEngineVersionId) {
				throw new AppError(
					"Voicebank is not associated with the specified engine version",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
			if (engineVersion && engine && engineVersion.svsEngineId !== perf.svsEngineId) {
				throw new AppError(
					"Engine version does not belong to the specified engine",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
		}
	}

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
		const { performances, creations, lyrics, ...songData } = input;

		if (performances?.length) {
			await this.validatePerformances(performances, client);
		}

		try {
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
						lyrics: lyrics && {
							create: lyrics,
						},
					},
				})
			);
		} catch (e) {
			if (typeof e === "object" && e !== null && "code" in e && e.code === "P2003") {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}
			throw e;
		}
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
