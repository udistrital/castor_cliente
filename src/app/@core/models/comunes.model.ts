export interface ApiEnvelope<T> {
  Success: boolean;
  Status: number | string;
  Message: string;
  Data: T;
}
