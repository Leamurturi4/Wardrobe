import type {
  InspirationResult,
  StyleItemRequest,
  WardrobeItem,
} from "@workspace/api-zod";

export type InspirationSearchOptions = Pick<
  StyleItemRequest,
  "occasion" | "style" | "formality"
>;

export interface InspirationSource {
  search(
    selectedGarment: WardrobeItem,
    options: InspirationSearchOptions,
  ): Promise<InspirationResult>;
}

export const noOpInspirationSource: InspirationSource = {
  async search() {
    return { provider: "none", directions: [] };
  },
};
