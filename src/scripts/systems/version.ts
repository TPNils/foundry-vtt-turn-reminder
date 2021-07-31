export class Version {
  
  public static fromString(value: string): Version {
    const split = value.split('.');
    if (split.length > 3) {
      throw new Error(`Invalid version: ${value}`)
    }

    const parsed: number[] = [];
    for (const splitValue of split) {
      const nrValue = Number.parseInt(splitValue);
      if (Number.isNaN(nrValue)) {
        throw new Error(`Invalid version: ${value}`);
      }
      parsed.push(nrValue);
    }

    
    return new Version(parsed)
  }

  public static isMinGameVersion(version: string): boolean {
    return Version.fromString(version).lte(Version.fromString(game.data.version))
  }

  constructor(
    private readonly versionParts: number[]
  ) {
    if (versionParts.length > 3) {
      throw new Error(`Invalid version: ${versionParts}`)
    }
  }

  public major(): number {
    return this.getSafePart(0);
  }

  public minor(): number {
    return this.getSafePart(1);
  }

  public patch(): number {
    return this.getSafePart(2);
  }

  private getSafePart(index: number): number {
    return this.versionParts.length > index ? this.versionParts[index] : 0;
  }

  public gt(other: Version): boolean {
    return this.localCompare(other) > 0;
  }

  public gte(other: Version): boolean {
    return this.localCompare(other) >= 0;
  }

  public eq(other: Version): boolean {
    return this.localCompare(other) === 0;
  }

  public lt(other: Version): boolean {
    return this.localCompare(other) < 0;
  }

  public lte(other: Version): boolean {
    return this.localCompare(other) <= 0;
  }

  public localCompare(other: Version): 1 | 0 | -1 {
    if (other == null || other.versionParts == null) {
      return -1;
    }

    const maxSize = Math.max(this.versionParts.length, other.versionParts.length);
    for (let i = 0; i < maxSize; i++) {
      if (this.getSafePart(i) > other.getSafePart(i)) {
        return 1;
      }
      if (this.getSafePart(i) < other.getSafePart(i)) {
        return -1;
      }
    }

    return 0;
  }

  public toString(): string {
    return this.versionParts.join('.');
  }

}