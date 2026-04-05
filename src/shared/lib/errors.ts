class AuthExpiredError extends Error {
  constructor(source: string) {
    super(`Authentication expired for ${source}`);
    this.name = 'AuthExpiredError';
  }
}

export { AuthExpiredError };
