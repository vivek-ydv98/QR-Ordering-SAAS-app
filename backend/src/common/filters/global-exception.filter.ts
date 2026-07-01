import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Something went wrong. Please try again.';
    let field: string | undefined = undefined;

    // 1. Handle custom AppError hierarchy
    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorCode = exception.errorCode;
      message = exception.message;
      field = exception.field;
    }
    // 2. Handle built-in NestJS HttpExceptions
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = exceptionResponse.message || exception.message;
        // Parse validation errors from NestJS ValidationPipe
        if (statusCode === HttpStatus.BAD_REQUEST && Array.isArray(exceptionResponse.message)) {
          errorCode = 'VALIDATION_ERROR';
          message = exceptionResponse.message[0]; // Take the first error description
          
          // Try to extract field name from message if standard (e.g. "email must be an email")
          const firstErrMessage = exceptionResponse.message[0];
          const firstWord = firstErrMessage.split(' ')[0];
          if (firstWord) {
            field = firstWord.replace(/[^a-zA-Z0-9_]/g, '');
          }
        } else {
          // Map other standard HTTP statuses to correct error codes
          errorCode = this.mapHttpStatusToErrorCode(statusCode);
        }
      } else {
        message = exception.message;
        errorCode = this.mapHttpStatusToErrorCode(statusCode);
      }
    }
    // 3. Handle database failures (Prisma)
    else if (exception.code && exception.clientVersion) {
      // Prisma Client error detected
      const prismaCode = exception.code;
      this.logger.error(`Prisma Client Error [${prismaCode}]: ${exception.message}`);

      if (prismaCode === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        errorCode = 'CONFLICT';
        // Extract field name from targets if present
        const target = exception.meta?.target;
        field = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : undefined;
        message = field ? `A record with this ${field} already exists.` : 'Record conflict. Unique constraint failed.';
      } else if (prismaCode === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
        message = exception.meta?.cause || 'Required record not found.';
      } else {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = 'INTERNAL_SERVER_ERROR';
        message = 'Database operation failed.';
      }
    }
    // 4. Handle JWT errors specifically
    else if (exception.name === 'JsonWebTokenError' || exception.name === 'TokenExpiredError') {
      statusCode = HttpStatus.UNAUTHORIZED;
      errorCode = 'UNAUTHORIZED';
      message = exception.name === 'TokenExpiredError' ? 'Your session has expired. Please login again.' : 'Invalid credentials or token expired.';
    }

    // Correlation and context variables for detailed logs
    const tenantId = request.headers['x-tenant-id'] || request['tenantId'] || 'N/A';
    const userId = request.user?.['id'] || 'N/A';
    const requestId = request.headers['x-request-id'] || 'N/A';
    const path = request.url;
    const method = request.method;
    const timestamp = new Date().toISOString();

    // Log the error with full metadata
    this.logger.error(
      JSON.stringify({
        timestamp,
        method,
        path,
        statusCode,
        errorCode,
        message: exception.message || message,
        tenantId,
        userId,
        requestId,
        stack: exception.stack,
      }, null, 2)
    );

    // Return sanitized standard response payload (no stack traces or database errors)
    const errorResponse: any = {
      success: false,
      errorCode,
      message,
    };

    if (field) {
      errorResponse.field = field;
    }

    response.status(statusCode).json(errorResponse);
  }

  private mapHttpStatusToErrorCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_ERROR';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
