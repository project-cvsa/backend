import { prisma } from "@cvsa/db";
import { ArtistRepository } from "./repository";
import { ArtistService } from "./service";

export const artistRepository = new ArtistRepository(prisma);
export const artistService = new ArtistService(artistRepository);
