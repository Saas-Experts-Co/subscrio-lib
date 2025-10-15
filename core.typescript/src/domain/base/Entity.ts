/**
 * Base Entity class for all domain entities
 * Entities are identified by a unique ID
 */
export abstract class Entity<T> {
  public readonly props: T;
  private readonly _id: string;

  constructor(props: T, id: string) {
    this.props = props;
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  public equals(entity: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    return this._id === entity._id;
  }
}

