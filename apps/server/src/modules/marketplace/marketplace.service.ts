import { marketplaceRepository } from "./marketplace.repository.js";
import { NotFoundError } from "../../utils/errors.js";

function toPublicListing(listing: {
  id: string;
  slug: string;
  name: string;
  description: string;
  developerName: string;
  type: string;
  price: unknown;
  logoUrl: string | null;
  category: string;
  rating: unknown;
  reviewCount: number;
  installCount: number;
  tags: string | null;
}) {
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    description: listing.description,
    developerName: listing.developerName,
    type: listing.type,
    price: listing.price === null ? null : Number(listing.price),
    logoUrl: listing.logoUrl,
    category: listing.category,
    rating: Number(listing.rating),
    reviewCount: listing.reviewCount,
    installCount: listing.installCount,
    tags: listing.tags ? (JSON.parse(listing.tags) as string[]) : [],
  };
}

export const marketplaceService = {
  async browse(organizationId: string) {
    const [listings, installs] = await Promise.all([
      marketplaceRepository.listApproved(),
      marketplaceRepository.listInstalls(organizationId),
    ]);
    const installedIds = new Set(installs.map((i) => i.listingId));
    return listings.map((l) => ({ ...toPublicListing(l), installed: installedIds.has(l.id) }));
  },

  async install(organizationId: string, installedById: string, slug: string) {
    const listing = await marketplaceRepository.findBySlug(slug);
    if (!listing || listing.status !== "APPROVED") throw new NotFoundError("Listing not found");
    await marketplaceRepository.install(organizationId, listing.id, installedById);
    return { installed: true };
  },

  async uninstall(organizationId: string, slug: string) {
    const listing = await marketplaceRepository.findBySlug(slug);
    if (!listing) throw new NotFoundError("Listing not found");
    const install = await marketplaceRepository.findInstall(organizationId, listing.id);
    if (!install || install.status !== "ACTIVE") throw new NotFoundError("Not installed");
    await marketplaceRepository.uninstall(organizationId, listing.id);
    return { installed: false };
  },
};
