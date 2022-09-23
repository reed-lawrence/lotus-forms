export interface ILoader {
  id: string;
  remove(): Promise<void>;
}