export class ApiError extends Error {
  constructor(message: string, public status: number, public path: string) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SwapError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SwapError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}