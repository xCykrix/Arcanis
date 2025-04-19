export abstract class Initializable {
  public abstract initialize(): Promise<void> | void;
}
