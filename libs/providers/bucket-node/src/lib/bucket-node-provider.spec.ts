import { ErrorCode } from '@openfeature/core';
import { BucketNodeProvider } from './bucket-node-provider';

jest.mock('@bucketco/node-sdk', () => {
  const actualModule = jest.requireActual('@bucketco/node-sdk');

  return {
    __esModule: true,
    ...actualModule,
    BucketClient: jest.fn(),
  };
});

const bucketClientMock: jest.Mocked<BucketClient> = {
  getFeatures: jest.fn(),
  initialize: jest.fn().mockResolvedValue({}),
} as unknown as jest.Mocked<BucketClient>;

import { BucketClient } from '@bucketco/node-sdk';

const secretKey = 'sec_fakeSecretKey______'; // must be 23 characters long

const context = {
  targetingKey: 'abc',
  name: 'John Doe',
  email: 'john@acme.inc',
};

const bucketContext = {
  user: { id: '42' },
  company: { id: '99' },
};

describe('BucketNodeProvider', () => {
  let provider: BucketNodeProvider;

  const newBucketClient = BucketClient as jest.Mock;
  newBucketClient.mockReturnValue(bucketClientMock);

  const translatorFn = jest.fn().mockReturnValue(bucketContext);

  beforeAll(async () => {
    provider = new BucketNodeProvider({ secretKey, contextTranslator: translatorFn });
    await provider.initialize();
  });

  it('calls the constructor', () => {
    expect(newBucketClient).toHaveBeenCalledTimes(1);
    expect(newBucketClient).toHaveBeenCalledWith({ secretKey });
  });

  it('uses the contextTranslator function', async () => {
    const track = jest.fn();
    bucketClientMock.getFeatures.mockReturnValue({
      booleanTrue: {
        isEnabled: true,
        key: 'booleanTrue',
        track,
      },
    });

    await provider.resolveBooleanEvaluation('booleanTrue', false, context);
    expect(translatorFn).toHaveBeenCalledTimes(1);
    expect(translatorFn).toHaveBeenCalledWith(context);
    expect(bucketClientMock.getFeatures).toHaveBeenCalledTimes(1);
    expect(bucketClientMock.getFeatures).toHaveBeenCalledWith(bucketContext);
  });

  describe('method resolveBooleanEvaluation', () => {
    it('should return right value if key exists', async () => {
      const result = await provider.resolveBooleanEvaluation('booleanTrue', false, context);
      expect(result.value).toEqual(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('should return the default value if key does not exists', async () => {
      const result = await provider.resolveBooleanEvaluation('non-existent', true, context);
      expect(result.value).toEqual(true);
      expect(result.errorCode).toEqual(ErrorCode.FLAG_NOT_FOUND);
    });
  });

  describe('method resolveNumberEvaluation', () => {
    it('should return the default value and an error message', async () => {
      const result = await provider.resolveNumberEvaluation('number1', 42);
      expect(result.value).toEqual(42);
      expect(result.errorCode).toEqual(ErrorCode.GENERAL);
      expect(result.errorMessage).toEqual(`Bucket doesn't support number flags`);
    });
  });

  describe('method resolveStringEvaluation', () => {
    it('should return the default value and an error message', async () => {
      const result = await provider.resolveStringEvaluation('number1', 'defaultValue');
      expect(result.value).toEqual('defaultValue');
      expect(result.errorCode).toEqual(ErrorCode.GENERAL);
      expect(result.errorMessage).toEqual(`Bucket doesn't support string flags`);
    });
  });
  describe('method resolveObjectEvaluation', () => {
    it('should return the default value and an error message', async () => {
      const defaultValue = { key: 'value' };
      const result = await provider.resolveObjectEvaluation('number1', defaultValue);
      expect(result.value).toEqual(defaultValue);
      expect(result.errorCode).toEqual(ErrorCode.GENERAL);
      expect(result.errorMessage).toEqual(`Bucket doesn't support object flags`);
    });
  });
});
