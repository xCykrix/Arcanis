/** A Base Abstraction of Chainable Initializable Classes. */
export abstract class AsyncInitializable {
  public abstract initialize(): Promise<void>;
}
