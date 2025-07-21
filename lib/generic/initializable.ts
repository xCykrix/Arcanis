export abstract class AsyncInitializable {
  public abstract initialize(): Promise<void>;
}
