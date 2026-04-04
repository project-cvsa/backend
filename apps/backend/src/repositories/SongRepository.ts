import { prisma } from "@lib/prisma";
import type { ISongRepository, CreateSongData, SingerInput } from "./interfaces";
import type { Song } from "@project-cvsa/db";
import { Prisma, type PrismaClient } from "@project-cvsa/db";
import { AppError } from "@lib/error";

export class SongRepository implements ISongRepository {
	private prisma: PrismaClient;

	constructor(prismaClient: PrismaClient = prisma) {
		this.prisma = prismaClient;
	}

	private async validateSingerInputs(
		singers: SingerInput[],
		db: Prisma.TransactionClient | PrismaClient
	): Promise<void> {
		for (const singer of singers) {
			// Step 1: Verify singerId exists first — prevents consistency errors masking a bad ID
			const singerRecord = await db.singer.findUnique({
				where: { id: singer.singerId },
				select: { id: true },
			});
			if (!singerRecord) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			// Step 2: Verify existence of all optional referenced IDs
			const voicebank =
				singer.voicebankId != null
					? await db.voicebank.findUnique({
							where: { id: singer.voicebankId },
							select: {
								singerId: true,
								svsEngineVersionId: true,
								svsEngineVersion: { select: { svsEngineId: true } },
							},
						})
					: null;
			if (singer.voicebankId != null && !voicebank) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			const engineVersion =
				singer.svsEngineVersionId != null
					? await db.svsEngineVersion.findUnique({
							where: { id: singer.svsEngineVersionId },
							select: { svsEngineId: true },
						})
					: null;
			if (singer.svsEngineVersionId != null && !engineVersion) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			const engine =
				singer.svsEngineId != null
					? await db.svsEngine.findUnique({
							where: { id: singer.svsEngineId },
							select: { id: true },
						})
					: null;
			if (singer.svsEngineId != null && !engine) {
				throw new AppError("One or more referenced IDs do not exist", "INVALID_RELATION_ID", 422);
			}

			// Step 3: Cross-entity consistency checks (all IDs confirmed to exist)
			if (voicebank && voicebank.singerId !== singer.singerId) {
				throw new AppError(
					"Voicebank does not belong to the specified singer",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
			if (voicebank && engineVersion && voicebank.svsEngineVersionId !== singer.svsEngineVersionId) {
				throw new AppError(
					"Voicebank is not associated with the specified engine version",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
			if (voicebank && engine && !engineVersion && voicebank.svsEngineVersion.svsEngineId !== singer.svsEngineId) {
				throw new AppError(
					"Voicebank's engine version does not belong to the specified engine",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}
			if (engineVersion && engine && engineVersion.svsEngineId !== singer.svsEngineId) {
				throw new AppError(
					"Engine version does not belong to the specified engine",
					"INCONSISTENT_SINGER_RELATION",
					422
				);
			}

			// Step 4: Without a voicebank bridging the relationship, verify that the singer
			// is actually capable of using the given engine/version via the join tables
			if (!voicebank) {
				if (engineVersion) {
					const singerVersionLink = await db.singerSvsEngineVersion.findFirst({
						where: { singerId: singer.singerId, svsEngineVersionId: singer.svsEngineVersionId! },
						select: { id: true },
					});
					if (!singerVersionLink) {
						throw new AppError(
							"Engine version is not associated with the specified singer",
							"INCONSISTENT_SINGER_RELATION",
							422
						);
					}
				} else if (engine) {
					const singerEngineLink = await db.singerSvsEngine.findFirst({
						where: { singerId: singer.singerId, svsEngineId: singer.svsEngineId! },
						select: { id: true },
					});
					if (!singerEngineLink) {
						throw new AppError(
							"Engine is not associated with the specified singer",
							"INCONSISTENT_SINGER_RELATION",
							422
						);
					}
				}
			}
		}
	}

	async create(data: CreateSongData, transaction?: Prisma.TransactionClient): Promise<Song> {
		const createData = {
			type: data.type,
			name: data.name,
			duration: data.duration,
			description: data.description,
			singerOfSongs: data.singers?.length
				? {
						create: data.singers.map((s) => ({
							singerId: s.singerId,
							voicebankId: s.voicebankId,
							svsEngineId: s.svsEngineId,
							svsEngineVersionId: s.svsEngineVersionId,
						})),
					}
				: undefined,
			artists: data.artists?.length
				? {
						create: data.artists.map((a) => ({
							artistId: a.artistId,
							role: a.role,
						})),
					}
				: undefined,
			lyrics: data.lyrics?.length
				? {
						create: data.lyrics.map((l) => ({
							language: l.language,
							plainText: l.plainText,
							ttml: l.ttml,
							lrc: l.lrc,
						})),
					}
				: undefined,
		};
		try {
			if (transaction) {
				if (data.singers?.length) {
					await this.validateSingerInputs(data.singers, transaction);
				}
				return await transaction.song.create({ data: createData });
			}

			return await this.prisma.$transaction(async (tx) => {
				if (data.singers?.length) {
					await this.validateSingerInputs(data.singers, tx);
				}
				return tx.song.create({ data: createData });
			});
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
				throw new AppError(
					"One or more referenced IDs do not exist",
					"INVALID_RELATION_ID",
					422
				);
			}
			throw e;
		}
	}
}

export function createSongRepository(prismaClient?: PrismaClient): SongRepository {
	return new SongRepository(prismaClient);
}
