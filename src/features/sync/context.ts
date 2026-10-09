/** The space this phone syncs with. Null means local-only mode. Set once by the space store. */
let currentSpaceId: string | null = null;

export function getSpaceId(): string | null {
  return currentSpaceId;
}

export function setSpaceId(id: string | null): void {
  currentSpaceId = id;
}
