export interface Loader {
  id: string;
  remove(): Promise<void>;
}