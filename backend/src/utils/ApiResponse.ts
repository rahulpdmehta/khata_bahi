export class ApiResponse<T = unknown> {
  constructor(
    public success: boolean,
    public data?: T,
    public message?: string,
    public statusCode: number = 200
  ) {}

  static success<T>(data: T, message = 'Success', statusCode = 200) {
    return new ApiResponse(true, data, message, statusCode);
  }

  static error(message: string, statusCode = 500) {
    return new ApiResponse(false, undefined, message, statusCode);
  }
}
