import { GlobalExceptionFilter } from '../../../../backend/src/common/filters/global-exception.filter';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../../../backend/src/common/errors/app-error';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  const createHost = (exception: any) =>
    ({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({
          method: 'GET',
          url: '/v1/test',
          headers: {},
          user: undefined,
        }),
      }),
      getArgByIndex: jest.fn(),
    }) as any;

  it('formats AppError correctly', () => {
    const error = new ValidationError('Invalid email', 'email');
    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid email',
      field: 'email',
    });
  });

  it('formats NotFoundError correctly', () => {
    const error = new NotFoundError('Order not found');
    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Order not found',
      field: undefined,
    });
  });

  it('formats ForbiddenError correctly', () => {
    const error = new ForbiddenError();
    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'FORBIDDEN',
      })
    );
  });

  it('handles NestJS HttpException', () => {
    const error = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'VALIDATION_ERROR',
      })
    );
  });

  it('handles Prisma P2002 (unique constraint)', () => {
    const error: any = new Error('Unique constraint failed');
    error.code = 'P2002';
    error.clientVersion = '6.4.0';

    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'CONFLICT',
      })
    );
  });

  it('handles Prisma P2025 (not found)', () => {
    const error: any = new Error('Record not found');
    error.code = 'P2025';
    error.clientVersion = '6.4.0';

    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'NOT_FOUND',
      })
    );
  });

  it('handles generic Error with 500', () => {
    const error = new Error('Something went wrong');
    filter.catch(error, createHost(error));

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Something went wrong. Please try again.',
      })
    );
  });
});
